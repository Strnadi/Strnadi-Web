<route lang="yaml">
meta:
  layout: desktop/center
</route>

<template>
  <div class="flex w-full min-h-[60vh] flex-row gap-x-10">
    <!-- Tabs for open editors -->
    <div
      :class="[
        'flex flex-col transition-[width] duration-200 ease-in-out',
        isSidebarCollapsed ? 'w-12' : 'w-64'
      ]"
    >
      <div class="flex flex-row items-center gap-2 mb-4">
        <button
          v-wave
          class="px-2 py-1 border rounded"
          :title="isSidebarCollapsed ? 'Show editors' : 'Hide editors'"
          @click="toggleSidebar"
        >
          <list-icon class="w-8 h-8" />
        </button>
        <h3
          v-if="!isSidebarCollapsed"
          class="text-lg font-semibold"
        >
          Editors
        </h3>
        <button
          v-if="!isSidebarCollapsed"
          v-wave
          class="ml-auto px-2 py-1 border rounded"
          @click="addEditor"
        >
          +
        </button>
      </div>

      <div
        v-if="!isSidebarCollapsed"
        class="flex flex-col gap-2"
      >
        <template
          v-for="(ed, i) in editors"
          :key="ed.id"
        >
          <div class="flex items-center">
            <button
              v-wave
              :class="[
                'flex-1 text-left px-3 py-2 rounded',
                { 'bg-gray-200': currentEditorIndex === i }
              ]"
              @click="switchEditor(i)"
            >
              {{ ed.title }}
            </button>
            <button
              v-wave
              class="ml-2 px-2 py-1 text-sm"
              @click="closeEditor(i)"
            >
              ✕
            </button>
          </div>
        </template>
      </div>
      <!-- 
      <div v-else class="flex flex-col items-center gap-2">
        <button @click="addEditor" class="px-2 py-1 border rounded" v-wave>+</button>
      </div> -->
    </div>

    <div class="flex flex-1 flex-col gap-y-2 min-h-0">
      <div class="flex flex-1 flex-col gap-4 min-h-0 overflow-hidden">
        <div
          ref="blocklyArea"
          class="relative flex-1 min-h-0 overflow-hidden"
        >
          <div
            ref="blocklyDiv"
            class="h-full min-h-80 w-full overflow-hidden rounded-lg border border-gray-200 bg-white"
          />
        </div>

        <div class="flex flex-col gap-3">
          <div class="flex flex-row flex-wrap gap-2">
            <button @click="generateAndExportSQL">
              Export .sql
            </button>
            <button @click="generateSQL">
              Generate SQL
            </button>
            <button @click="saveWorkspace">
              Save XML
            </button>
            <button @click="loadWorkspace">
              Load saved XML
            </button>
          </div>

          <label><strong>Generated SQL</strong></label>
          <textarea
            v-model="generatedSQL"
            class="w-full resize-y rounded border border-gray-200 p-2 font-mono text-sm"
            rows="2"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import 'blockly/javascript';
import type { Block, WorkspaceSvg } from 'blockly/core';
import * as En from 'blockly/msg/en';
import * as Cz from 'blockly/msg/cs';
import ListIcon from '@/icons/interface/icon-list.svg';
import type { translations } from '@/constants/Translations';
import { applicationStore } from '@/state/ApplicationStore';

const locales: Record<keyof typeof translations, Record<string, string>> = {
  'en-US': En,
  'cs-CZ': Cz
};

Blockly.setLocale(locales[applicationStore.language]);

watch(
  () => applicationStore.language,
  (newLanguage: keyof typeof translations) => {
    Blockly.setLocale(locales[newLanguage]);
  }
);

interface EditorTab {
  id: string;
  title: string;
  xml: string;
}

const blocklyDiv = ref<HTMLElement | null>(null);
const blocklyArea = ref<HTMLElement | null>(null);
let workspace: WorkspaceSvg | null = null;
let resizeObserver: ResizeObserver | null = null;
let resizeFrame = 0;

const generatedSQL = ref('');

const isSidebarCollapsed = ref(false);
function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
}

// Starter XML for new editors
const starterXml = `
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
</xml>`;

// editors: each editor stores an id, title and xml content
const editors = ref<EditorTab[]>([
  { id: String(Date.now()), title: 'Editor 1', xml: starterXml }
]);
const currentEditorIndex = ref(0);

function resizeWorkspace() {
  if (!workspace || !blocklyArea.value || !blocklyDiv.value) return;
  if (resizeFrame) {
    cancelAnimationFrame(resizeFrame);
  }
  resizeFrame = requestAnimationFrame(() => {
    if (!workspace || !blocklyArea.value || !blocklyDiv.value) return;
    const area = blocklyArea.value;
    const host = blocklyDiv.value;
    host.style.width = `${area.clientWidth}px`;
    host.style.height = `${area.clientHeight}px`;
    Blockly.svgResize(workspace);
  });
}

function saveCurrentEditorXml() {
  if (!workspace) return;
  const current = editors.value[currentEditorIndex.value];
  if (!current) return;
  const xml = Blockly.Xml.workspaceToDom(workspace);
  const xmlText = Blockly.utils.xml.domToText(xml);
  current.xml = xmlText;
}

function loadEditorXml(index: number) {
  if (!workspace) return;
  const ed = editors.value[index];
  if (!ed) return;
  workspace.clear();
  if (ed.xml) {
    try {
      Blockly.Xml.domToWorkspace(
        Blockly.utils.xml.textToDom(ed.xml),
        workspace
      );
    } catch (e) {
      // if parsing fails, ignore and leave empty workspace
      console.warn('Failed to load editor xml', e);
    }
  }
  nextTick(() => {
    resizeWorkspace();
  });
}

function addEditor() {
  saveCurrentEditorXml();
  const id = String(Date.now());
  const title = `Editor ${editors.value.length + 1}`;
  editors.value.push({ id, title, xml: starterXml });
  // switch to new editor after next tick
  currentEditorIndex.value = editors.value.length - 1;
  // load after next tick to ensure workspace updates
  nextTick(() => {
    loadEditorXml(currentEditorIndex.value);
  });
}

function switchEditor(i: number) {
  if (i === currentEditorIndex.value) return;
  saveCurrentEditorXml();
  currentEditorIndex.value = i;
  loadEditorXml(i);
}

function closeEditor(i: number) {
  // Save current before closing
  saveCurrentEditorXml();
  editors.value.splice(i, 1);
  if (editors.value.length === 0) {
    // ensure at least one editor exists
    editors.value.push({
      id: String(Date.now()),
      title: 'Editor 1',
      xml: starterXml
    });
    currentEditorIndex.value = 0;
  } else {
    // adjust current index
    if (currentEditorIndex.value >= editors.value.length) {
      currentEditorIndex.value = editors.value.length - 1;
    } else if (currentEditorIndex.value > i) {
      currentEditorIndex.value -= 1;
    }
  }
  // load new current
  loadEditorXml(currentEditorIndex.value);
}

// --- Toolbox XML (put the block names you define below) ---
const toolboxXml = `
<xml id="toolbox" style="display: none">
<category name="SQL" colour="#1E88E5">
  <block type="select"></block>
  <block type="column"></block>
  <block type="where"></block>
  <block type="comparison"></block>
  <block type="new"></block>
</category>
</xml>
`;

Blockly.Blocks['new'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('when')
      .appendField(new Blockly.FieldTextInput('myButton'), 'TARGET')
      .appendField('clicked');
    this.appendStatementInput('DO').setCheck(null).appendField(''); // label optional
    this.setColour(160);
    this.setPreviousStatement(false);
    // Do NOT set nextStatement(true) — nested statements go into the "DO" input
    // visually you can still get a hat via jsonInit + "hat" or custom renderer
    this.setTooltip('Run when the target is clicked.');
  }
};

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
    this.appendStatementInput('WHERE').setCheck('where').appendField('WHERE');
    this.setColour(200);
    this.setTooltip('Select columns from a table with optional where clause');
    this.setHelpUrl('');
  }
};

// column block: a single column or expression. It will be a statement inside SELECT
Blockly.Blocks['column'] = {
  init: function () {
    this.appendDummyInput().appendField(
      new Blockly.FieldTextInput('col1'),
      'NAME'
    );
    this.setPreviousStatement(true, 'column');
    this.setNextStatement(true, 'column');
    this.setColour(120);
    this.setTooltip('Column (add multiple column blocks)');
  }
};

// comparison block used inside WHERE
Blockly.Blocks['comparison'] = {
  init: function () {
    this.appendValueInput('LEFT').setCheck(null).appendField('');
    this.appendDummyInput().appendField(
      new Blockly.FieldDropdown([
        ['=', 'EQ'],
        ['<>', 'NEQ'],
        ['>', 'GT'],
        ['<', 'LT'],
        ['>=', 'GTE'],
        ['<=', 'LTE']
      ]),
      'OP'
    );
    this.appendValueInput('RIGHT').setCheck(null);
    this.setInputsInline(true);
    this.setOutput(true);
    this.setColour(260);
    this.setTooltip('Comparison expression');
  }
};

// where block: a leaf that returns a condition (like "col = 5")
Blockly.Blocks['where'] = {
  init: function () {
    this.appendDummyInput()
      .appendField(new Blockly.FieldTextInput('col1'), 'LEFT')
      .appendField(
        new Blockly.FieldDropdown([
          ['=', 'EQ'],
          ['<>', 'NEQ']
        ]),
        'OP'
      )
      .appendField(new Blockly.FieldTextInput('value'), 'RIGHT');
    this.setPreviousStatement(true, 'where');
    this.setNextStatement(true, 'where');
    this.setColour(0);
    this.setTooltip('Where clause item');
  }
};

// --- Create a custom SQL generator ---
type SqlGenerator = Blockly.Generator & {
  quoteId(id: string): string;
  column(block: Block): string;
  where(block: Block): string;
  select(block: Block): string;
};

const SQL = new Blockly.Generator('SQL') as SqlGenerator;

// helper to quote identifiers naively (you may want to do dialect-specific quoting)
SQL.quoteId = function (id: string) {
  if (!id) return id;
  // very small safety: remove newlines and semicolons
  return id.replace(/[\n\r;]/g, '').trim();
};

// generator for column (a statement): returns "col," (note final comma handled later)
SQL.column = function (block: Block) {
  const name = block.getFieldValue('NAME') || 'col';
  return SQL.quoteId(name) + ', ';
};

// generator for where block (statement)
SQL.where = function (block: Block) {
  const left = SQL.quoteId(block.getFieldValue('LEFT') || 'col');
  const op = block.getFieldValue('OP') || '=';
  const rightField = block.getFieldValue('RIGHT') || 'value';
  // naive: if right looks like a number don't quote, else quote lightly
  const right = /^\d+(\.\d+)?$/.test(rightField)
    ? rightField
    : `'${rightField.replace(/'/g, "''")}'`;
  return `${left} ${op} ${right} AND `;
};

// generator for select: assemble pieces
SQL.select = function (block: Block) {
  // columns: statementToCode returns concatenated column strings (each ends with ", ")
  let columnsCode = SQL.statementToCode(block, 'COLUMNS') || '';
  // remove trailing comma/whitespace
  columnsCode = columnsCode.replace(/,\s*$/, '');
  if (!columnsCode) columnsCode = '*';

  const table = SQL.quoteId(block.getFieldValue('TABLE') || 'my_table');

  // where: statementToCode returns 'cond AND cond AND ' — strip trailing AND
  let whereCode = SQL.statementToCode(block, 'WHERE') || '';
  whereCode = whereCode.replace(/\s*AND\s*$/, '').trim();

  let sql = `SELECT ${columnsCode} FROM ${table}`;
  if (whereCode) sql += ` WHERE ${whereCode}`;
  sql += ';';
  return sql + '\n';
};

// If you want to use generators like valueToCode/statementToCode you should
// implement or reuse generator helpers from the standard generators. The
// core Blockly Generator class has helpful methods we used above. See docs.

// --- Lifecycle: inject workspace ---
onMounted(() => {
  if (!blocklyDiv.value) return;
  workspace = Blockly.inject(blocklyDiv.value, {
    toolbox: Blockly.utils.xml.textToDom(toolboxXml),
    collapse: false,
    comments: true,
    disable: false,
    maxBlocks: Infinity,
    trashcan: true,
    horizontalLayout: false,
    scrollbars: false,
    sounds: true
  });

  loadEditorXml(currentEditorIndex.value);
  resizeWorkspace();

  window.addEventListener('resize', resizeWorkspace);
  if (typeof ResizeObserver !== 'undefined' && blocklyArea.value) {
    resizeObserver = new ResizeObserver(() => {
      resizeWorkspace();
    });
    resizeObserver.observe(blocklyArea.value);
  }
});

// cleanup
onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeWorkspace);
  if (resizeFrame) {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = 0;
  }
  if (resizeObserver && blocklyArea.value) {
    resizeObserver.unobserve(blocklyArea.value);
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (workspace) {
    workspace.dispose();
    workspace = null;
  }
});

// --- UI actions ---
function generateSQL() {
  if (!workspace) return;
  // use our custom generator to convert top-level blocks to SQL
  // Note: workspaceToCode will call SQL for blocks if SQL is the active generator.
  // We can use SQL.workspaceToCode(workspace) to generate the full SQL text.
  try {
    const code = SQL.workspaceToCode(workspace);
    generatedSQL.value = code;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    generatedSQL.value = '-- Error generating SQL: ' + message;
  }
}

// export a .sql file
function generateAndExportSQL() {
  generateSQL();
  const sql = generatedSQL.value || '';
  const blob = new Blob([sql], { type: 'application/sql' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'query.sql';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// save workspace to localStorage (example)
function saveWorkspace() {
  // persist all editors
  if (!workspace) return;
  saveCurrentEditorXml();
  try {
    localStorage.setItem('my_sql_editors', JSON.stringify(editors.value));
    alert('All editors saved');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    alert('Failed to save editors: ' + message);
  }
}

// load workspace from localStorage
function loadWorkspace() {
  const json = localStorage.getItem('my_sql_editors');
  if (!json) {
    alert('No saved editors');
    return;
  }
  try {
    const parsed = JSON.parse(json) as EditorTab[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      editors.value = parsed.map((editor, index) => ({
        id: editor.id || String(Date.now() + index),
        title: editor.title || `Editor ${index + 1}`,
        xml: editor.xml || ''
      }));
      currentEditorIndex.value = 0;
      // reload into workspace
      loadEditorXml(0);
      alert('Editors loaded');
      return;
    }
    alert('No editors found in saved data');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    alert('Failed to load editors: ' + message);
  }
}
</script>

<style scoped>
button {
  padding: 6px 10px;
}
</style>
