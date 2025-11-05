<route lang="yaml">
meta:
  layout: desktop/center
</route>

<template>
  <div class="w-full flex flex-col gap-y-2 h-full">
    <div class="flex gap-4 h-full">
      <div ref="blocklyArea" class="flex-1 max-h-full">
        <div ref="blocklyDiv" class="h-full w-full border border-gray-200"></div>
      </div>

      <div class="w-1/3 flex flex-col gap-2 h-full">
        <div class="flex gap-2">
          <button @click="generateAndExportSQL">Export .sql</button>
          <button @click="generateSQL">Generate SQL</button>
          <button @click="saveWorkspace">Save XML</button>
          <button @click="loadWorkspace">Load saved XML</button>
        </div>

        <label><strong>Generated SQL</strong></label>
        <textarea v-model="generatedSQL" rows="18" style="width:100%; font-family:monospace;"></textarea>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as Blockly from 'blockly/core';
import * as libraryBlocks from 'blockly/blocks';
import { javascriptGenerator } from 'blockly/javascript';
import * as En from 'blockly/msg/en';

Blockly.setLocale(En);

const blocklyDiv = ref(null)
const blocklyArea = ref(null)
let workspace = null

const generatedSQL = ref('')

// --- Toolbox XML (put the block names you define below) ---
const toolboxXml = `
<xml id="toolbox" style="display: none">
<category name="SQL" colour="#1E88E5">
  <block type="select"></block>
  <block type="column"></block>
  <block type="where"></block>
  <block type="comparison"></block>
</category>
</xml>
`

// --- Define simple example blocks ---
// SELECT block: holds column statements and a table name and optional WHERE
Blockly.Blocks['select'] = {
  init: function () {
    this.appendStatementInput('COLUMNS')
      .setCheck('column')
      .appendField('SELECT');
    this.appendDummyInput()
      .appendField('FROM')
      .appendField(new Blockly.FieldTextInput('my_table'), 'TABLE');
    this.appendStatementInput('WHERE')
      .setCheck('where')
      .appendField('WHERE');
    this.setColour(200);
    this.setTooltip('Select columns from a table with optional where clause');
    this.setHelpUrl('');
  }
}

// column block: a single column or expression. It will be a statement inside SELECT
Blockly.Blocks['column'] = {
  init: function () {
    this.appendDummyInput()
      .appendField(new Blockly.FieldTextInput('col1'), 'NAME');
    this.setPreviousStatement(true, 'column');
    this.setNextStatement(true, 'column');
    this.setColour(120);
    this.setTooltip('Column (add multiple column blocks)');
  }
}

// comparison block used inside WHERE
Blockly.Blocks['comparison'] = {
  init: function () {
    this.appendValueInput('LEFT').setCheck(null).appendField('');
    this.appendDummyInput().appendField(new Blockly.FieldDropdown([
      ['=', 'EQ'], ['<>', 'NEQ'], ['>', 'GT'], ['<', 'LT'], ['>=', 'GTE'], ['<=', 'LTE']
    ]), 'OP');
    this.appendValueInput('RIGHT').setCheck(null);
    this.setInputsInline(true);
    this.setOutput(true);
    this.setColour(260);
    this.setTooltip('Comparison expression');
  }
}

// where block: a leaf that returns a condition (like "col = 5")
Blockly.Blocks['where'] = {
  init: function () {
    this.appendDummyInput()
      .appendField(new Blockly.FieldTextInput('col1'), 'LEFT')
      .appendField(new Blockly.FieldDropdown([['=', 'EQ'], ['<>', 'NEQ']]), 'OP')
      .appendField(new Blockly.FieldTextInput('value'), 'RIGHT');
    this.setPreviousStatement(true, 'where');
    this.setNextStatement(true, 'where');
    this.setColour(0);
    this.setTooltip('Where clause item');
  }
}

// --- Create a custom SQL generator ---
const SQL = new Blockly.Generator('SQL')

// helper to quote identifiers naively (you may want to do dialect-specific quoting)
SQL.quoteId = function (id) {
  if (!id) return id
  // very small safety: remove newlines and semicolons
  return id.replace(/[\n\r;]/g, '').trim()
}

// generator for column (a statement): returns "col," (note final comma handled later)
SQL['column'] = function (block) {
  const name = block.getFieldValue('NAME') || 'col'
  return SQL.quoteId(name) + ', '
}

// generator for where block (statement)
SQL['where'] = function (block) {
  const left = SQL.quoteId(block.getFieldValue('LEFT') || 'col')
  const op = block.getFieldValue('OP') || '='
  const right = block.getFieldValue('RIGHT') || '\'value\''
  // naive: if right looks like a number don't quote, else quote lightly
  const r = /^\d+(\.\d+)?$/.test(right) ? right : `'${right.replace(/'/g, "''")}'`
  return `${left} ${op} ${r} AND `
}

// generator for select: assemble pieces
SQL['select'] = function (block) {
  // columns: statementToCode returns concatenated column strings (each ends with ", ")
  let columnsCode = SQL.statementToCode(block, 'COLUMNS') || ''
  // remove trailing comma/whitespace
  columnsCode = columnsCode.replace(/,\s*$/, '')
  if (!columnsCode) columnsCode = '*'

  const table = SQL.quoteId(block.getFieldValue('TABLE') || 'my_table')

  // where: statementToCode returns 'cond AND cond AND ' — strip trailing AND
  let whereCode = SQL.statementToCode(block, 'WHERE') || ''
  whereCode = whereCode.replace(/\s*AND\s*$/, '').trim()

  let sql = `SELECT ${columnsCode} FROM ${table}`
  if (whereCode) sql += ` WHERE ${whereCode}`
  sql += ';'
  return sql + '\n'
}

// If you want to use generators like valueToCode/statementToCode you should
// implement or reuse generator helpers from the standard generators. The
// core Blockly Generator class has helpful methods we used above. See docs.

// --- Lifecycle: inject workspace ---
onMounted(() => {
  workspace = Blockly.inject(blocklyDiv.value, {
    toolbox: Blockly.utils.xml.textToDom(toolboxXml),
    collapse: false,
    comments: true,
    disable: false,
    maxBlocks: Infinity,
    trashcan: true,
    horizontalLayout: false,
    scrollbars: false,
    sounds: true,
  })

  // Optional: load a starter select block
  const xmlText = `
<xml>
  <block type="select" x="20" y="20">
  <field name="TABLE">customers</field>
  <statement name="COLUMNS">
    <block type="column">
    <field name="NAME">id</field>
    <next>
      <block type="column">
      <field name="NAME">name</field>
      </block>
    </next>
    </block>
  </statement>
  <statement name="WHERE">
    <block type="where">
    <field name="LEFT">status</field>
    <field name="OP">=</field>
    <field name="RIGHT">active</field>
    </block>
  </statement>
  </block>
</xml>`
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xmlText), workspace)
})

// cleanup
onBeforeUnmount(() => {
  if (workspace) {
    workspace.dispose()
    workspace = null
  }
})

// --- UI actions ---
function generateSQL() {
  if (!workspace) return
  // use our custom generator to convert top-level blocks to SQL
  // Note: workspaceToCode will call SQL for blocks if SQL is the active generator.
  // We can use SQL.workspaceToCode(workspace) to generate the full SQL text.
  try {
    const code = SQL.workspaceToCode(workspace)
    generatedSQL.value = code
  } catch (err) {
    generatedSQL.value = '-- Error generating SQL: ' + err.message
  }
}

// export a .sql file
function generateAndExportSQL() {
  generateSQL()
  const sql = generatedSQL.value || ''
  const blob = new Blob([sql], { type: 'application/sql' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'query.sql'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// save workspace to localStorage (example)
function saveWorkspace() {
  if (!workspace) return
  const xml = Blockly.Xml.workspaceToDom(workspace)
  const xmlText = Blockly.utils.xml.domToText(xml)
  localStorage.setItem('my_sql_workspace', xmlText)
  alert('Workspace saved')
}

// load workspace from localStorage
function loadWorkspace() {
  const xmlText = localStorage.getItem('my_sql_workspace')
  if (!xmlText) { alert('No saved workspace'); return }
  workspace.clear()
  Blockly.Xml.domToWorkspace(Blockly.utils.xml.textToDom(xmlText), workspace)
  alert('Workspace loaded')
}
</script>

<style scoped>
button {
  padding: 6px 10px;
}
</style>