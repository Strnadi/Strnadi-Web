<route lang="yaml">
meta:
  layout: desktop/center
</route>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch
} from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import * as Blockly from 'blockly/core';
import type { Block, WorkspaceSvg } from 'blockly/core';
import 'blockly/blocks';
import 'blockly/javascript';
import * as En from 'blockly/msg/en';
import * as Cz from 'blockly/msg/cs';

import TranslatedText, { t } from '@/components/TranslatedText.vue';
import ListIcon from '@/icons/interface/icon-list.svg';
import type { translations } from '@/constants/Translations';
import { applicationStore } from '@/state/ApplicationStore';
import { accountStore } from '@/state/AccountStore';
import {
  createAchievement,
  getAchievements,
  updateAchievement,
  type Achievement,
  type AchievementContentPayload
} from '@/api/achievements';

type SchemaTable = {
  name: string;
  label: string;
  alias: string;
  columns: string[];
};

const schemaTables: SchemaTable[] = [
  {
    name: 'users',
    label: 'Users',
    alias: 'u',
    columns: [
      'id',
      'email',
      'nickname',
      'first_name',
      'last_name',
      'post_code',
      'city',
      'consent',
      'creation_date',
      'role',
      'is_email_verified',
      'deleted',
      'legacy',
      'appleid',
      'google_id'
    ]
  },
  {
    name: 'recordings',
    label: 'Recordings',
    alias: 'r',
    columns: [
      'id',
      'user_id',
      'created_at',
      'estimated_birds_count',
      'by_app',
      'name',
      'note',
      'note_post',
      'device',
      'deleted',
      'legacy',
      'expected_parts_count'
    ]
  },
  {
    name: 'recording_parts',
    label: 'Recording parts',
    alias: 'rp',
    columns: [
      'id',
      'recording_id',
      'start_date',
      'end_date',
      'gps_latitude_start',
      'gps_longitude_start',
      'gps_latitude_end',
      'gps_longitude_end',
      'file_path',
      'length'
    ]
  },
  {
    name: 'filtered_recording_parts',
    label: 'Filtered parts',
    alias: 'frp',
    columns: [
      'id',
      'recording_id',
      'start_date',
      'end_date',
      'state',
      'representant_flag',
      'parent_id'
    ]
  },
  {
    name: 'user_achievement',
    label: 'User achievements',
    alias: 'ua',
    columns: ['id', 'user_id', 'achievement_id']
  },
  {
    name: 'achievements',
    label: 'Achievements',
    alias: 'ach',
    columns: ['id', 'image_path', 'sql']
  }
];

const tableDropdownOptions: [string, string][] = schemaTables.map((table) => [
  `${table.label} (${table.name})`,
  table.name
]);

const columnSuggestionOptions: [string, string][] = schemaTables.reduce<
  [string, string][]
>(
  (acc, table) => {
    table.columns.forEach((column) => {
      acc.push([
        `${table.label} - ${table.alias}.${column}`,
        `${table.alias}.${column}`
      ]);
    });
    return acc;
  },
  [
    ['Pick column…', '__placeholder__'],
    ['*', '*']
  ]
);

const aggregatorOptions: [string, string][] = [
  ['Value', 'RAW'],
  ['COUNT', 'COUNT'],
  ['COUNT DISTINCT', 'COUNT_DISTINCT'],
  ['SUM', 'SUM'],
  ['AVG', 'AVG'],
  ['MIN', 'MIN'],
  ['MAX', 'MAX']
];

const joinTypeOptions: [string, string][] = [
  ['INNER', 'INNER'],
  ['LEFT', 'LEFT'],
  ['RIGHT', 'RIGHT'],
  ['FULL', 'FULL'],
  ['CROSS', 'CROSS']
];

const operatorOptions: [string, string][] = [
  ['=', '='],
  ['<>', '<>'],
  ['>', '>'],
  ['>=', '>='],
  ['<', '<'],
  ['<=', '<='],
  ['IN', 'IN'],
  ['NOT IN', 'NOT IN'],
  ['LIKE', 'LIKE'],
  ['ILIKE', 'ILIKE'],
  ['IS NULL', 'IS NULL'],
  ['IS NOT NULL', 'IS NOT NULL']
];

const valueTypeOptions: [string, string][] = [
  ['Text', 'STRING'],
  ['Number', 'NUMBER'],
  ['Reference', 'RAW'],
  ['List (text)', 'LIST_STRING'],
  ['List (number)', 'LIST_NUMBER']
];

const normalizeBlocklyLocale = (localeModule: any): Record<string, string> =>
  (localeModule?.default ?? localeModule) as Record<string, string>;

const locales: Record<keyof typeof translations, Record<string, string>> = {
  'en-US': normalizeBlocklyLocale(En),
  'cs-CZ': normalizeBlocklyLocale(Cz),
  'de-DE': normalizeBlocklyLocale(En)
};

Blockly.setLocale(locales[applicationStore.language]);

watch(
  () => applicationStore.language,
  (newLanguage: keyof typeof translations) => {
    Blockly.setLocale(locales[newLanguage]);
  }
);

const contentLanguages = [
  { code: 'cs', label: 'Čeština' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' }
] as const;

type ContentLocaleCode = (typeof contentLanguages)[number]['code'];

type ContentFormState = Record<
  ContentLocaleCode,
  { title: string; description: string }
>;

const createEmptyContentState = (): ContentFormState => ({
  cs: { title: '', description: '' },
  en: { title: '', description: '' },
  de: { title: '', description: '' }
});

const cloneContentState = (state: ContentFormState): ContentFormState => ({
  cs: { ...state.cs },
  en: { ...state.en },
  de: { ...state.de }
});

interface EditorSnapshot {
  sql: string;
  contents: ContentFormState;
  imageUrl?: string | null;
}

interface EditorTab {
  id: string;
  title: string;
  xml: string;
  sql: string;
  achievementId?: number;
  contents: ContentFormState;
  imageUrl?: string | null;
  badgeFile: File | null;
  localImageUrl: string | null;
  baseline: EditorSnapshot;
  dirty: boolean;
}

const blocklyDiv = ref<HTMLElement | null>(null);
const blocklyArea = ref<HTMLElement | null>(null);
let workspace: WorkspaceSvg | null = null;
let resizeObserver: ResizeObserver | null = null;
let resizeFrame = 0;

const generatedSQL = ref('');
const builderMessage = ref<string | null>(null);
const builderError = ref<string | null>(null);
const formMessage = ref<string | null>(null);
const formError = ref<string | null>(null);

const builderStorageKey = 'achievement_sql_editors';

const starterXml = `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="achievement_select" x="30" y="30">
    <field name="DISTINCT_MODE">ALL</field>
    <field name="TABLE">recordings</field>
    <field name="BASE_ALIAS">r</field>
    <field name="LIMIT_VALUE">0</field>
    <statement name="COLUMNS">
      <block type="achievement_column">
        <field name="AGGREGATION">RAW</field>
        <field name="EXPR">r.user_id</field>
        <field name="ALIAS">user_id</field>
      </block>
    </statement>
  </block>
</xml>
`;

type EditorInit = Partial<EditorTab> & { baseline?: EditorSnapshot };

const createEditorTab = (init?: EditorInit): EditorTab => {
  const contents =
    init?.contents !== undefined
      ? cloneContentState(init.contents)
      : createEmptyContentState();
  const sql = init?.sql ?? '';
  const imageUrl = init?.imageUrl ?? null;
  const baseline =
    init?.baseline ??
    ({
      sql,
      contents: cloneContentState(contents),
      imageUrl
    } as EditorSnapshot);

  return {
    id: init?.id ?? String(Date.now()),
    title: init?.title ?? 'Editor',
    xml: init?.xml ?? starterXml,
    sql,
    achievementId: init?.achievementId,
    contents,
    imageUrl,
    badgeFile: init?.badgeFile ?? null,
    localImageUrl: init?.localImageUrl ?? null,
    baseline,
    dirty: init?.dirty ?? false
  };
};

const builderTemplates = [
  {
    id: 'dialect-states',
    title: 'Dialect review states',
    description:
      'Returns distinct users that have filtered recording parts reviewed in states 2, 3, 5 or 7.',
    xml: `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="achievement_select" x="30" y="30">
    <field name="DISTINCT_MODE">DISTINCT</field>
    <field name="TABLE">recordings</field>
    <field name="BASE_ALIAS">r</field>
    <field name="LIMIT_VALUE">0</field>
    <statement name="COLUMNS">
      <block type="achievement_column">
        <field name="AGGREGATION">RAW</field>
        <field name="EXPR">r.user_id</field>
        <field name="ALIAS">user_id</field>
      </block>
    </statement>
    <statement name="JOINS">
      <block type="achievement_join">
        <field name="TYPE">INNER</field>
        <field name="TABLE">filtered_recording_parts</field>
        <field name="ALIAS">frp</field>
        <field name="ON">frp.recording_id = r.id</field>
      </block>
    </statement>
    <statement name="WHERE">
      <block type="achievement_where">
        <field name="LEFT">frp.state</field>
        <field name="OP">IN</field>
        <field name="VALUE">2,3,5,7</field>
        <field name="VALUE_TYPE">LIST_NUMBER</field>
      </block>
    </statement>
  </block>
</xml>
`
  },
  {
    id: 'recording-count',
    title: 'At least one recording',
    description:
      'Counts recordings per user and filters to anyone who has at least one entry.',
    xml: `
<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="achievement_select" x="30" y="30">
    <field name="DISTINCT_MODE">ALL</field>
    <field name="TABLE">recordings</field>
    <field name="BASE_ALIAS">r</field>
    <field name="LIMIT_VALUE">0</field>
    <statement name="COLUMNS">
      <block type="achievement_column">
        <field name="AGGREGATION">RAW</field>
        <field name="EXPR">r.user_id</field>
        <field name="ALIAS">user_id</field>
        <next>
          <block type="achievement_column">
            <field name="AGGREGATION">COUNT</field>
            <field name="EXPR">*</field>
            <field name="ALIAS">recordings_count</field>
          </block>
        </next>
      </block>
    </statement>
    <statement name="GROUP_BY">
      <block type="achievement_group_by">
        <field name="EXPR">r.user_id</field>
      </block>
    </statement>
    <statement name="HAVING">
      <block type="achievement_having">
        <field name="LEFT">COUNT(*)</field>
        <field name="OP">></field>
        <field name="VALUE">0</field>
        <field name="VALUE_TYPE">NUMBER</field>
      </block>
    </statement>
  </block>
</xml>
`
  }
] as const;

const draftTitle = (index: number) =>
  `${t('admin.achievements.editor.draftLabel')} ${index}`;

const editors = ref<EditorTab[]>([createEditorTab({ title: draftTitle(1) })]);
const currentEditorIndex = ref(0);
const currentEditor = computed(
  () => editors.value[currentEditorIndex.value] ?? null
);
const isExistingAchievement = computed(() =>
  Boolean(currentEditor.value?.achievementId)
);
const isCurrentEditorDirty = computed(
  () => currentEditor.value?.dirty ?? false
);
const currentPreviewImage = computed(
  () =>
    currentEditor.value?.localImageUrl ?? currentEditor.value?.imageUrl ?? null
);

const contentForm = reactive<ContentFormState>(createEmptyContentState());
const badgeInputRef = ref<HTMLInputElement | null>(null);

let syncingEditorState = false;

function hydrateFormFromEditor(editor: EditorTab | null) {
  syncingEditorState = true;
  generatedSQL.value = editor?.sql ?? '';
  contentLanguages.forEach((lang) => {
    contentForm[lang.code].title = editor?.contents[lang.code].title ?? '';
    contentForm[lang.code].description =
      editor?.contents[lang.code].description ?? '';
  });
  if (badgeInputRef.value) {
    badgeInputRef.value.value = '';
  }
  syncingEditorState = false;
}

const isSidebarCollapsed = ref(false);
function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
}

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
  current.xml = Blockly.utils.xml.domToText(xml);
}

function loadEditorXml(index: number) {
  if (!workspace) return;
  const editor = editors.value[index];
  if (!editor) return;
  workspace.clear();
  if (editor.xml) {
    try {
      Blockly.Xml.domToWorkspace(
        Blockly.utils.xml.textToDom(editor.xml),
        workspace
      );
    } catch (error) {
      console.warn('Failed to load editor XML', error);
    }
  }
  hydrateFormFromEditor(editor);
  nextTick(() => {
    resizeWorkspace();
  });
}

function addEditor() {
  saveCurrentEditorXml();
  const title = draftTitle(editors.value.length + 1);
  editors.value.push(createEditorTab({ title }));
  currentEditorIndex.value = editors.value.length - 1;
  nextTick(() => {
    loadEditorXml(currentEditorIndex.value);
  });
}

function switchEditor(index: number) {
  if (index === currentEditorIndex.value) return;
  saveCurrentEditorXml();
  currentEditorIndex.value = index;
  loadEditorXml(index);
}

function closeEditor(index: number) {
  const editor = editors.value[index];
  if (editor?.dirty) {
    const confirmed = window.confirm(
      t('admin.achievements.editor.closeConfirm')
    );
    if (!confirmed) {
      return;
    }
  }
  if (editor?.localImageUrl) {
    URL.revokeObjectURL(editor.localImageUrl);
  }
  saveCurrentEditorXml();
  editors.value.splice(index, 1);
  if (editors.value.length === 0) {
    editors.value.push(createEditorTab({ title: draftTitle(1) }));
    currentEditorIndex.value = 0;
  } else if (currentEditorIndex.value >= editors.value.length) {
    currentEditorIndex.value = editors.value.length - 1;
  } else if (currentEditorIndex.value > index) {
    currentEditorIndex.value -= 1;
  }
  loadEditorXml(currentEditorIndex.value);
}

const toolboxXml = `
<xml xmlns="https://developers.google.com/blockly/xml" id="achievement-toolbox">
  <category name="Query" colour="#1E88E5">
    <block type="achievement_select"></block>
  </category>
  <category name="Columns" colour="#43A047">
    <block type="achievement_column"></block>
  </category>
  <category name="Joins" colour="#F4511E">
    <block type="achievement_join"></block>
  </category>
  <category name="Filters" colour="#6A1B9A">
    <block type="achievement_where"></block>
    <block type="achievement_having"></block>
  </category>
  <category name="Grouping" colour="#00897B">
    <block type="achievement_group_by"></block>
  </category>
</xml>
`;

const createSuggestionDropdown = (
  target: Blockly.FieldTextInput
): Blockly.FieldDropdown => {
  const dropdown = new Blockly.FieldDropdown(
    columnSuggestionOptions,
    (value) => {
      if (value && value !== '__placeholder__') {
        target.setValue(value);
        return '__placeholder__';
      }
      return value;
    }
  );
  dropdown.setValue('__placeholder__');
  return dropdown;
};

Blockly.Blocks['achievement_select'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('SELECT')
      .appendField(
        new Blockly.FieldDropdown([
          ['All rows', 'ALL'],
          ['Distinct rows', 'DISTINCT']
        ]),
        'DISTINCT_MODE'
      );
    this.appendStatementInput('COLUMNS')
      .setCheck('achievement_column')
      .appendField('Columns');
    this.appendDummyInput()
      .appendField('FROM')
      .appendField(new Blockly.FieldDropdown(tableDropdownOptions), 'TABLE')
      .appendField('AS')
      .appendField(new Blockly.FieldTextInput('t1'), 'BASE_ALIAS');
    this.appendStatementInput('JOINS')
      .setCheck('achievement_join')
      .appendField('Joins');
    this.appendStatementInput('WHERE')
      .setCheck('achievement_where')
      .appendField('Where');
    this.appendStatementInput('GROUP_BY')
      .setCheck('achievement_group_by')
      .appendField('Group by');
    this.appendStatementInput('HAVING')
      .setCheck('achievement_having')
      .appendField('Having');
    this.appendDummyInput()
      .appendField('LIMIT')
      .appendField(new Blockly.FieldNumber(0, 0, Infinity, 1), 'LIMIT_VALUE');
    this.setColour(200);
    this.setTooltip('Define the root SELECT query for an achievement.');
  }
};

Blockly.Blocks['achievement_column'] = {
  init: function () {
    const expressionField = new Blockly.FieldTextInput('r.user_id');
    const dropdown = createSuggestionDropdown(expressionField);
    this.appendDummyInput()
      .appendField('Aggregation')
      .appendField(new Blockly.FieldDropdown(aggregatorOptions), 'AGGREGATION');
    this.appendDummyInput()
      .appendField('Expression')
      .appendField(expressionField, 'EXPR')
      .appendField(dropdown, 'EXPR_PICKER');
    this.appendDummyInput()
      .appendField('Alias')
      .appendField(new Blockly.FieldTextInput('user_id'), 'ALIAS');
    this.setPreviousStatement(true, 'achievement_column');
    this.setNextStatement(true, 'achievement_column');
    this.setColour(120);
    this.setTooltip('Add a column or aggregation to the SELECT clause.');
  }
};

Blockly.Blocks['achievement_join'] = {
  init: function () {
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown(joinTypeOptions), 'TYPE')
      .appendField('JOIN')
      .appendField(new Blockly.FieldDropdown(tableDropdownOptions), 'TABLE')
      .appendField('AS')
      .appendField(new Blockly.FieldTextInput('t2'), 'ALIAS');
    this.appendDummyInput()
      .appendField('ON')
      .appendField(new Blockly.FieldTextInput('t2.recording_id = t1.id'), 'ON');
    this.setPreviousStatement(true, 'achievement_join');
    this.setNextStatement(true, 'achievement_join');
    this.setColour(25);
    this.setTooltip('Configure JOIN clauses for related tables.');
  }
};

Blockly.Blocks['achievement_where'] = {
  init: function () {
    const leftField = new Blockly.FieldTextInput('frp.state');
    const leftPicker = createSuggestionDropdown(leftField);
    this.appendDummyInput()
      .appendField('Field')
      .appendField(leftField, 'LEFT')
      .appendField(leftPicker, 'LEFT_PICKER');
    this.appendDummyInput()
      .appendField('Operator')
      .appendField(new Blockly.FieldDropdown(operatorOptions), 'OP');
    this.appendDummyInput()
      .appendField('Value')
      .appendField(new Blockly.FieldTextInput('value'), 'VALUE')
      .appendField(new Blockly.FieldDropdown(valueTypeOptions), 'VALUE_TYPE');
    this.setPreviousStatement(true, 'achievement_where');
    this.setNextStatement(true, 'achievement_where');
    this.setColour(0);
    this.setTooltip('Add WHERE conditions to limit the query results.');
  }
};

Blockly.Blocks['achievement_group_by'] = {
  init: function () {
    const exprField = new Blockly.FieldTextInput('r.user_id');
    const picker = createSuggestionDropdown(exprField);
    this.appendDummyInput()
      .appendField('Group by')
      .appendField(exprField, 'EXPR')
      .appendField(picker, 'EXPR_PICKER');
    this.setPreviousStatement(true, 'achievement_group_by');
    this.setNextStatement(true, 'achievement_group_by');
    this.setColour(210);
    this.setTooltip('Specify GROUP BY expressions.');
  }
};

Blockly.Blocks['achievement_having'] = {
  init: function () {
    this.appendDummyInput()
      .appendField('Aggregate')
      .appendField(new Blockly.FieldTextInput('COUNT(*)'), 'LEFT');
    this.appendDummyInput()
      .appendField('Operator')
      .appendField(new Blockly.FieldDropdown(operatorOptions), 'OP');
    this.appendDummyInput()
      .appendField('Value')
      .appendField(new Blockly.FieldTextInput('0'), 'VALUE')
      .appendField(new Blockly.FieldDropdown(valueTypeOptions), 'VALUE_TYPE');
    this.setPreviousStatement(true, 'achievement_having');
    this.setNextStatement(true, 'achievement_having');
    this.setColour(300);
    this.setTooltip('Add HAVING filters for aggregated queries.');
  }
};

const sanitizeIdentifier = (value: string) =>
  value.replace(/[\n\r;]/g, ' ').trim();

const escapeLiteral = (value: string) => value.replace(/'/g, "''");

const formatList = (value: string, quote: boolean) => {
  const entries = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!entries.length) {
    return quote ? "('')" : '(0)';
  }
  const serialized = entries.map((entry) =>
    quote ? `'${escapeLiteral(entry)}'` : entry || '0'
  );
  return `(${serialized.join(', ')})`;
};

const formatValue = (value: string, type: string): string => {
  const trimmed = value.trim();
  switch (type) {
    case 'NUMBER':
      return trimmed || '0';
    case 'RAW':
      return trimmed || '0';
    case 'LIST_STRING':
      return formatList(trimmed, true);
    case 'LIST_NUMBER':
      return formatList(trimmed, false);
    default:
      return `'${escapeLiteral(trimmed)}'`;
  }
};

const buildComparison = (
  left: string,
  operator: string,
  value: string,
  valueType: string
) => {
  const column = sanitizeIdentifier(left);
  if (!column) return '';
  if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
    return `${column} ${operator}`;
  }
  const formattedValue = formatValue(value, valueType);
  return `${column} ${operator} ${formattedValue}`;
};

type AchievementSqlGenerator = Blockly.Generator & {
  achievement_column(block: Block): string;
  achievement_join(block: Block): string;
  achievement_where(block: Block): string;
  achievement_having(block: Block): string;
  achievement_group_by(block: Block): string;
  achievement_select(block: Block): string;
};

const SQL = new Blockly.Generator('ACH_SQL') as AchievementSqlGenerator;

SQL['achievement_column'] = function (block: Block) {
  const expr = sanitizeIdentifier(block.getFieldValue('EXPR') || '*') || '*';
  const alias = sanitizeIdentifier(block.getFieldValue('ALIAS') || '');
  const aggregation = block.getFieldValue('AGGREGATION') || 'RAW';
  let columnSql = expr;
  switch (aggregation) {
    case 'COUNT':
      columnSql = `COUNT(${expr})`;
      break;
    case 'COUNT_DISTINCT':
      columnSql = `COUNT(DISTINCT ${expr})`;
      break;
    case 'SUM':
      columnSql = `SUM(${expr})`;
      break;
    case 'AVG':
      columnSql = `AVG(${expr})`;
      break;
    case 'MIN':
      columnSql = `MIN(${expr})`;
      break;
    case 'MAX':
      columnSql = `MAX(${expr})`;
      break;
    default:
      break;
  }
  if (alias) {
    columnSql += ` AS ${alias}`;
  }
  return columnSql + ', ';
};

SQL['achievement_join'] = function (block: Block) {
  const joinType = block.getFieldValue('TYPE') || 'INNER';
  const table = block.getFieldValue('TABLE') || 'recordings';
  const alias = sanitizeIdentifier(block.getFieldValue('ALIAS') || '');
  const onClause = block.getFieldValue('ON')?.trim() || '1 = 1';
  if (joinType === 'CROSS') {
    return `CROSS JOIN ${table}${alias ? ` ${alias}` : ''}\n`;
  }
  return `${joinType} JOIN ${table}${alias ? ` ${alias}` : ''} ON ${onClause}\n`;
};

SQL['achievement_where'] = function (block: Block) {
  const clause = buildComparison(
    block.getFieldValue('LEFT') || '',
    block.getFieldValue('OP') || '=',
    block.getFieldValue('VALUE') || '',
    block.getFieldValue('VALUE_TYPE') || 'STRING'
  );
  if (!clause) return '';
  return `${clause} AND `;
};

SQL['achievement_having'] = SQL['achievement_where'];

SQL['achievement_group_by'] = function (block: Block) {
  const expr = sanitizeIdentifier(block.getFieldValue('EXPR') || '');
  if (!expr) return '';
  return expr + ', ';
};

SQL['achievement_select'] = function (block: Block) {
  let columnsCode = SQL.statementToCode(block, 'COLUMNS') || '';
  columnsCode = columnsCode.replace(/,\s*$/, '');
  if (!columnsCode.trim()) {
    columnsCode = '*';
  }
  const table = block.getFieldValue('TABLE') || 'recordings';
  const alias = sanitizeIdentifier(block.getFieldValue('BASE_ALIAS') || '');
  let joinsCode = SQL.statementToCode(block, 'JOINS') || '';
  let whereCode = SQL.statementToCode(block, 'WHERE') || '';
  whereCode = whereCode.replace(/\s*AND\s*$/i, '').trim();
  let groupByCode = SQL.statementToCode(block, 'GROUP_BY') || '';
  groupByCode = groupByCode.replace(/,\s*$/, '').trim();
  let havingCode = SQL.statementToCode(block, 'HAVING') || '';
  havingCode = havingCode.replace(/\s*AND\s*$/i, '').trim();
  const distinct =
    block.getFieldValue('DISTINCT_MODE') === 'DISTINCT' ? ' DISTINCT' : '';
  const limit = Number(block.getFieldValue('LIMIT_VALUE') || 0);
  let sql = `SELECT${distinct} ${columnsCode}\nFROM ${table}${
    alias ? ` ${alias}` : ''
  }\n`;
  if (joinsCode.trim()) {
    sql += joinsCode;
  }
  if (whereCode) {
    sql += `WHERE ${whereCode}\n`;
  }
  if (groupByCode) {
    sql += `GROUP BY ${groupByCode}\n`;
  }
  if (havingCode) {
    sql += `HAVING ${havingCode}\n`;
  }
  if (limit > 0) {
    sql += `LIMIT ${limit}\n`;
  }
  sql += ';\n';
  return sql;
};

const handleTemplateLoad = (templateId: string) => {
  const template = builderTemplates.find((tpl) => tpl.id === templateId);
  if (!template) return;
  const current = editors.value[currentEditorIndex.value];
  if (current) {
    current.xml = template.xml;
  }
  loadEditorXml(currentEditorIndex.value);
  builderMessage.value = t('admin.achievements.builder.templateLoaded');
  builderError.value = null;
};

function generateSQL() {
  if (!workspace) return;
  try {
    generatedSQL.value = SQL.workspaceToCode(workspace).trim();
    builderError.value = null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    builderError.value = message;
    generatedSQL.value = '';
  }
}

function generateAndExportSQL() {
  generateSQL();
  if (!generatedSQL.value) return;
  const blob = new Blob([generatedSQL.value], { type: 'application/sql' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'achievement.sql';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function saveWorkspace() {
  if (!workspace) return;
  saveCurrentEditorXml();
  try {
    const serializable = editors.value.map((editor, index) => ({
      id: editor.id || String(Date.now() + index),
      title: editor.title,
      xml: editor.xml,
      sql: editor.sql,
      achievementId: editor.achievementId ?? null,
      contents: editor.contents,
      imageUrl: editor.imageUrl ?? null,
      baseline: editor.baseline
    }));
    localStorage.setItem(builderStorageKey, JSON.stringify(serializable));
    builderMessage.value = t('admin.achievements.builder.saveSuccess');
    builderError.value = null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    builderError.value = message;
  }
}

function loadWorkspace() {
  const stored = localStorage.getItem(builderStorageKey);
  if (!stored) {
    builderError.value = t('admin.achievements.builder.noSaved');
    return;
  }
  try {
    const parsed = JSON.parse(stored) as EditorInit[];
    if (!Array.isArray(parsed) || !parsed.length) {
      builderError.value = t('admin.achievements.builder.noSaved');
      return;
    }
    editors.value = parsed.map((editor, index) =>
      createEditorTab({
        id: editor.id || String(Date.now() + index),
        title: editor.title || `Editor ${index + 1}`,
        xml: editor.xml || starterXml,
        sql: editor.sql ?? '',
        achievementId: editor.achievementId ?? undefined,
        contents: editor.contents ?? createEmptyContentState(),
        imageUrl: editor.imageUrl ?? null,
        baseline: editor.baseline ?? {
          sql: editor.sql ?? '',
          contents: cloneContentState(
            editor.contents ?? createEmptyContentState()
          ),
          imageUrl: editor.imageUrl ?? null
        }
      })
    );
    currentEditorIndex.value = 0;
    loadEditorXml(0);
    builderMessage.value = t('admin.achievements.builder.loadSuccess');
    builderError.value = null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    builderError.value = message;
  }
}

onMounted(() => {
  if (!blocklyDiv.value) return;
  workspace = Blockly.inject(blocklyDiv.value, {
    toolbox: Blockly.utils.xml.textToDom(toolboxXml),
    collapse: false,
    comments: true,
    disable: false,
    trashcan: true,
    scrollbars: true,
    horizontalLayout: false
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

const queryClient = useQueryClient();

const {
  data: achievements,
  isLoading: isAchievementsLoading,
  isError: isAchievementsError,
  error: achievementsError,
  refetch: refetchAchievements
} = useQuery({
  queryKey: ['achievements-admin'],
  queryFn: getAchievements
});

const achievementFilter = ref('');
const achievementsErrorMessage = computed(() => {
  if (achievementsError.value instanceof Error) {
    return achievementsError.value.message;
  }
  return t('admin.achievements.list.error');
});

const sortedAchievements = computed<Achievement[]>(() => {
  const list = achievements.value ?? [];
  return [...list].sort((a, b) => b.id - a.id);
});

const filteredAchievements = computed<Achievement[]>(() => {
  const query = achievementFilter.value.trim().toLowerCase();
  if (!query) return sortedAchievements.value;
  return sortedAchievements.value.filter((achievement) => {
    if (achievement.sql.toLowerCase().includes(query)) {
      return true;
    }
    return achievement.contents.some((content) =>
      `${content.title} ${content.description}`.toLowerCase().includes(query)
    );
  });
});

const normalizeLanguageCode = (
  lang: keyof typeof translations
): 'cs' | 'en' | 'de' => {
  if (lang.startsWith('cs')) return 'cs';
  if (lang.startsWith('de')) return 'de';
  return 'en';
};

const currentContentLanguage = computed(() =>
  normalizeLanguageCode(applicationStore.language)
);

const resolveContent = (achievement: Achievement, languageCode: string) => {
  const content = achievement.contents.find(
    (entry) => entry.languageCode.toLowerCase() === languageCode.toLowerCase()
  );
  return content ?? achievement.contents[0] ?? null;
};

watch(generatedSQL, (value) => {
  if (syncingEditorState) return;
  const editor = currentEditor.value;
  if (!editor) return;
  editor.sql = value;
  editor.dirty = true;
});

watch(
  contentForm,
  () => {
    if (syncingEditorState) return;
    const editor = currentEditor.value;
    if (!editor) return;
    editor.contents = cloneContentState(contentForm);
    editor.dirty = true;
  },
  { deep: true }
);

const handleBadgeChange = (event: Event) => {
  const editor = currentEditor.value;
  if (!editor) return;
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0] ?? null;
  if (editor.localImageUrl) {
    URL.revokeObjectURL(editor.localImageUrl);
  }
  editor.badgeFile = file;
  editor.localImageUrl = file ? URL.createObjectURL(file) : null;
  editor.dirty = true;
};

onBeforeUnmount(() => {
  editors.value.forEach((editor) => {
    if (editor.localImageUrl) {
      URL.revokeObjectURL(editor.localImageUrl);
    }
  });
});

const hasCompleteContent = (editor: EditorTab) =>
  contentLanguages.every(
    (lang) =>
      editor.contents[lang.code].title.trim() &&
      editor.contents[lang.code].description.trim()
  );

const buildPayloadContents = (editor: EditorTab): AchievementContentPayload[] =>
  contentLanguages.map((lang) => ({
    languageCode: lang.code,
    title: editor.contents[lang.code].title.trim(),
    description: editor.contents[lang.code].description.trim()
  }));

const persistAchievementMutation = useMutation({
  mutationFn: async ({
    editor,
    contents,
    isUpdate
  }: {
    editor: EditorTab;
    contents: AchievementContentPayload[];
    isUpdate: boolean;
  }) => {
    if (!accountStore.token) {
      throw new Error(t('admin.achievements.form.missingToken'));
    }
    const payload = {
      sql: editor.sql,
      contents,
      file: editor.badgeFile
    };
    if (isUpdate && editor.achievementId) {
      await updateAchievement(
        accountStore.token,
        editor.achievementId,
        payload
      );
    } else {
      if (!payload.file) {
        throw new Error(t('admin.achievements.form.missingImage'));
      }
      await createAchievement(accountStore.token, payload);
    }
  },
  onSuccess: async (_data, variables) => {
    await refreshAchievementState(variables.editor, variables.isUpdate);
    formError.value = null;
    formMessage.value = variables.isUpdate
      ? t('admin.achievements.form.updated')
      : t('admin.achievements.form.success');
  },
  onError: (error) => {
    const message = error instanceof Error ? error.message : String(error);
    formError.value = message || t('admin.achievements.form.error');
    formMessage.value = null;
  }
});

const isSaving = computed(() => persistAchievementMutation.isPending.value);

const canSaveCurrentEditor = computed(() => {
  const editor = currentEditor.value;
  if (!editor) return false;
  if (!editor.sql.trim()) return false;
  if (!hasCompleteContent(editor)) return false;
  if (!editor.achievementId && !editor.badgeFile) return false;
  if (!editor.dirty) return false;
  return !isSaving.value;
});

const canDiscardCurrentEditor = computed(
  () => Boolean(currentEditor.value?.dirty) && !isSaving.value
);

const handleSaveCurrentEditor = () => {
  formMessage.value = null;
  formError.value = null;
  const editor = currentEditor.value;
  if (!editor) return;
  if (!editor.sql.trim()) {
    formError.value = t('admin.achievements.form.missingSql');
    return;
  }
  if (!hasCompleteContent(editor)) {
    formError.value = t('admin.achievements.form.missingContent');
    return;
  }
  if (!editor.achievementId && !editor.badgeFile) {
    formError.value = t('admin.achievements.form.missingImage');
    return;
  }
  persistAchievementMutation.mutate({
    editor,
    contents: buildPayloadContents(editor),
    isUpdate: Boolean(editor.achievementId)
  });
};

const handleDiscardChanges = () => {
  const editor = currentEditor.value;
  if (!editor || !editor.dirty) {
    return;
  }
  if (!window.confirm(t('admin.achievements.form.discardConfirm'))) {
    return;
  }
  if (editor.localImageUrl) {
    URL.revokeObjectURL(editor.localImageUrl);
  }
  editor.localImageUrl = null;
  editor.badgeFile = null;
  editor.sql = editor.baseline.sql;
  editor.contents = cloneContentState(editor.baseline.contents);
  editor.imageUrl = editor.baseline.imageUrl ?? null;
  editor.dirty = false;
  hydrateFormFromEditor(editor);
};

function setEditorBaseline(editor: EditorTab) {
  editor.baseline = {
    sql: editor.sql,
    contents: cloneContentState(editor.contents),
    imageUrl: editor.imageUrl ?? null
  };
  editor.dirty = false;
}

function buildContentStateFromAchievement(
  achievement: Achievement
): ContentFormState {
  const state = createEmptyContentState();
  contentLanguages.forEach((lang) => {
    const match = achievement.contents.find(
      (content) =>
        content.languageCode.toLowerCase() === lang.code.toLowerCase()
    );
    state[lang.code] = {
      title: match?.title ?? '',
      description: match?.description ?? ''
    };
  });
  return state;
}

function editorTitleFromAchievement(achievement: Achievement) {
  return (
    resolveContent(achievement, currentContentLanguage.value)?.title ??
    `${t('admin.achievements.list.identifier')} ${achievement.id}`
  );
}

function openAchievementInEditor(achievement: Achievement) {
  const existingIndex = editors.value.findIndex(
    (editor) => editor.achievementId === achievement.id
  );
  if (existingIndex >= 0) {
    switchEditor(existingIndex);
    return;
  }
  const contents = buildContentStateFromAchievement(achievement);
  const newEditor = createEditorTab({
    title: editorTitleFromAchievement(achievement),
    sql: achievement.sql,
    achievementId: achievement.id,
    contents,
    imageUrl: achievement.imageUrl ?? null,
    baseline: {
      sql: achievement.sql,
      contents: cloneContentState(contents),
      imageUrl: achievement.imageUrl ?? null
    }
  });
  editors.value.push(newEditor);
  currentEditorIndex.value = editors.value.length - 1;
  loadEditorXml(currentEditorIndex.value);
}

function duplicateAchievement(achievement: Achievement) {
  const contents = buildContentStateFromAchievement(achievement);
  const duplicateTitle = `${editorTitleFromAchievement(achievement)} (${t(
    'admin.achievements.list.duplicate'
  )})`;
  const newEditor = createEditorTab({
    title: duplicateTitle,
    sql: achievement.sql,
    contents,
    imageUrl: achievement.imageUrl ?? null
  });
  editors.value.push(newEditor);
  currentEditorIndex.value = editors.value.length - 1;
  loadEditorXml(currentEditorIndex.value);
}

async function refreshAchievementState(editor: EditorTab, isUpdate: boolean) {
  await queryClient.invalidateQueries({ queryKey: ['achievements-admin'] });
  const result = await refetchAchievements();
  const list = result.data ?? achievements.value ?? [];
  if (!list.length) {
    finalizeEditorAfterSave(editor);
    return;
  }
  if (isUpdate && editor.achievementId) {
    const updated = list.find((item) => item.id === editor.achievementId);
    if (updated) {
      editor.imageUrl = updated.imageUrl ?? editor.imageUrl ?? null;
    }
  } else {
    const created =
      list.find(
        (item) =>
          item.sql === editor.sql &&
          contentLanguages.every((lang) => {
            const target = editor.contents[lang.code];
            const apiContent = item.contents.find(
              (content) =>
                content.languageCode.toLowerCase() === lang.code.toLowerCase()
            );
            if (!apiContent) {
              return false;
            }
            return (
              target.title.trim() === apiContent.title.trim() &&
              target.description.trim() === apiContent.description.trim()
            );
          })
      ) ?? list[0];
    if (created) {
      editor.achievementId = created.id;
      editor.imageUrl = created.imageUrl ?? editor.imageUrl ?? null;
      editor.title = editorTitleFromAchievement(created);
    }
  }
  finalizeEditorAfterSave(editor);
}

function finalizeEditorAfterSave(editor: EditorTab) {
  if (editor.localImageUrl) {
    URL.revokeObjectURL(editor.localImageUrl);
  }
  editor.localImageUrl = null;
  editor.badgeFile = null;
  setEditorBaseline(editor);
  hydrateFormFromEditor(editor);
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <header class="flex flex-col gap-2">
      <h1 class="text-2xl font-semibold">
        <TranslatedText identifier="admin.dashboard.achievments" />
      </h1>
      <p class="text-sm text-gray-500">
        {{ t('admin.achievements.subtitle') }}
      </p>
    </header>

    <div class="grid gap-6 xl:grid-cols-[360px,1fr]">
      <section
        class="h-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div class="flex flex-col gap-3">
          <div>
            <h2 class="text-lg font-semibold">
              {{ t('admin.achievements.list.title') }}
            </h2>
            <p class="text-sm text-gray-500">
              {{ t('admin.achievements.list.description') }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <input
              v-model="achievementFilter"
              type="text"
              class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              :placeholder="t('admin.achievements.list.filterPlaceholder')"
            />
            <button
              type="button"
              class="rounded border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
              v-wave
              @click="refetchAchievements()"
            >
              {{ t('admin.achievements.list.reload') }}
            </button>
          </div>
        </div>

        <div class="mt-4 space-y-2 text-sm text-gray-500">
          <p v-if="isAchievementsLoading">
            {{ t('states.loading') }}
          </p>
          <p v-else-if="isAchievementsError">
            {{ achievementsErrorMessage }}
          </p>
          <p v-else-if="filteredAchievements.length === 0">
            {{ t('admin.achievements.list.empty') }}
          </p>
        </div>

        <div
          v-if="filteredAchievements.length"
          class="mt-5 flex flex-col gap-4"
        >
          <article
            v-for="achievement in filteredAchievements"
            :key="achievement.id"
            class="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4"
          >
            <div class="flex items-start gap-3">
              <img
                v-if="achievement.imageUrl"
                :src="achievement.imageUrl"
                alt=""
                class="h-12 w-12 rounded-lg border border-gray-200 object-cover"
              />
              <div class="flex-1">
                <p class="text-base font-semibold">
                  {{
                    resolveContent(achievement, currentContentLanguage)
                      ?.title || `#${achievement.id}`
                  }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ t('admin.achievements.list.identifier') }}
                  {{ achievement.id }}
                </p>
              </div>
            </div>
            <p class="text-sm text-gray-600">
              {{
                resolveContent(achievement, currentContentLanguage)
                  ?.description || ''
              }}
            </p>
            <pre
              class="max-h-36 overflow-y-auto rounded bg-white p-3 text-xs text-gray-800"
            ><code>{{ achievement.sql }}</code></pre>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="content in achievement.contents"
                :key="content.id"
                class="rounded bg-white px-2 py-1 text-xs font-medium text-gray-600"
              >
                {{ content.languageCode.toUpperCase() }} · {{ content.title }}
              </span>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-white"
                v-wave
                @click="openAchievementInEditor(achievement)"
              >
                {{ t('admin.achievements.list.openEditor') }}
              </button>
              <button
                type="button"
                class="rounded border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-white"
                v-wave
                @click="duplicateAchievement(achievement)"
              >
                {{ t('admin.achievements.list.duplicate') }}
              </button>
            </div>
          </article>
        </div>
      </section>

      <section
        class="flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div
          class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p class="text-xs font-semibold uppercase text-gray-500">
              {{ t('admin.achievements.editor.activeLabel') }}
            </p>
            <h2 class="text-2xl font-semibold">
              {{
                currentEditor?.title ?? t('admin.achievements.editor.noEditor')
              }}
            </h2>
            <p class="text-xs text-gray-500">
              <span v-if="currentEditor?.achievementId">
                {{ t('admin.achievements.list.identifier') }}
                {{ currentEditor?.achievementId }}
              </span>
              <span v-else>
                {{ t('admin.achievements.editor.newHint') }}
              </span>
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              class="rounded-full px-3 py-1 text-xs font-semibold"
              :class="
                isCurrentEditorDirty
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-emerald-100 text-emerald-800'
              "
            >
              {{
                isCurrentEditorDirty
                  ? t('admin.achievements.editor.statusDirty')
                  : t('admin.achievements.editor.statusClean')
              }}
            </span>
            <span
              class="rounded-full px-3 py-1 text-xs font-semibold"
              :class="
                isExistingAchievement
                  ? 'bg-blue-100 text-blue-900'
                  : 'bg-purple-100 text-purple-900'
              "
            >
              {{
                isExistingAchievement
                  ? t('admin.achievements.editor.modeEdit')
                  : t('admin.achievements.editor.modeCreate')
              }}
            </span>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            :disabled="!canSaveCurrentEditor"
            v-wave
            @click="handleSaveCurrentEditor"
          >
            <span v-if="isSaving">{{ t('states.loading') }}</span>
            <span v-else>
              {{
                isExistingAchievement
                  ? t('admin.achievements.form.update')
                  : t('admin.achievements.form.create')
              }}
            </span>
          </button>
          <button
            type="button"
            class="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
            :disabled="!canDiscardCurrentEditor"
            v-wave
            @click="handleDiscardChanges"
          >
            {{ t('admin.achievements.form.discard') }}
          </button>
        </div>

        <div class="text-sm">
          <p
            v-if="formMessage"
            class="text-emerald-600"
          >
            {{ formMessage }}
          </p>
          <p
            v-if="formError"
            class="text-red-600"
          >
            {{ formError }}
          </p>
        </div>

        <div class="flex flex-col gap-4 lg:flex-row lg:gap-6">
          <aside
            :class="[
              'flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-[width] duration-200',
              isSidebarCollapsed ? 'w-12' : 'w-72'
            ]"
          >
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded border border-gray-200 p-1"
                :title="t('admin.achievements.builder.toggleEditors')"
                v-wave
                @click="toggleSidebar"
              >
                <ListIcon class="h-6 w-6" />
              </button>
              <h3
                v-if="!isSidebarCollapsed"
                class="text-sm font-semibold"
              >
                {{ t('admin.achievements.builder.editorsTitle') }}
              </h3>
              <button
                v-if="!isSidebarCollapsed"
                type="button"
                class="ml-auto rounded border border-gray-200 px-2 py-1 text-sm hover:bg-gray-50"
                v-wave
                @click="addEditor"
              >
                {{ t('buttons.add') }}
              </button>
            </div>

            <div
              v-if="!isSidebarCollapsed"
              class="flex flex-col gap-2"
            >
              <div
                v-for="(editor, index) in editors"
                :key="editor.id"
                class="flex items-center gap-2"
              >
                <button
                  type="button"
                  class="flex-1 rounded px-3 py-2 text-left text-sm"
                  :class="{
                    'bg-gray-100 font-medium': currentEditorIndex === index
                  }"
                  v-wave
                  @click="switchEditor(index)"
                >
                  {{ editor.title }}
                </button>
                <button
                  type="button"
                  class="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
                  v-wave
                  @click="closeEditor(index)"
                >
                  ✕
                </button>
              </div>
            </div>

            <div
              v-if="!isSidebarCollapsed"
              class="mt-2 flex flex-col gap-2"
            >
              <h4 class="text-xs font-semibold uppercase text-gray-500">
                {{ t('admin.achievements.builder.templatesTitle') }}
              </h4>
              <div
                v-for="template in builderTemplates"
                :key="template.id"
                class="rounded-lg border border-dashed border-gray-200 p-3"
              >
                <p class="text-sm font-medium">{{ template.title }}</p>
                <p class="text-xs text-gray-500">
                  {{ template.description }}
                </p>
                <button
                  type="button"
                  class="mt-2 rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                  v-wave
                  @click="handleTemplateLoad(template.id)"
                >
                  {{ t('admin.achievements.builder.loadTemplate') }}
                </button>
              </div>
            </div>

            <div
              v-if="!isSidebarCollapsed"
              class="mt-2 flex-1 overflow-y-auto rounded-lg border border-gray-100 p-3"
            >
              <h4 class="mb-2 text-xs font-semibold uppercase text-gray-500">
                {{ t('admin.achievements.schema.title') }}
              </h4>
              <div
                v-for="table in schemaTables"
                :key="table.name"
                class="mb-3 text-xs"
              >
                <p class="font-semibold text-gray-700">
                  {{ table.label }} ({{ table.alias }})
                </p>
                <p class="text-gray-500">
                  {{ table.columns.join(', ') }}
                </p>
              </div>
            </div>
          </aside>

          <div class="flex flex-1 flex-col gap-4">
            <div
              ref="blocklyArea"
              class="relative flex-1 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <div
                ref="blocklyDiv"
                class="h-full w-full"
              />
            </div>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div class="rounded-2xl border border-gray-200 p-4 shadow-sm">
            <label class="text-sm font-medium text-gray-700">
              {{ t('admin.achievements.form.sqlLabel') }}
            </label>
            <textarea
              v-model="generatedSQL"
              class="mt-2 h-40 w-full rounded border border-gray-200 p-2 font-mono text-sm"
              spellcheck="false"
            />
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                v-wave
                @click="generateSQL"
              >
                {{ t('admin.achievements.actions.generate') }}
              </button>
              <button
                type="button"
                class="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                v-wave
                @click="generateAndExportSQL"
              >
                {{ t('admin.achievements.actions.export') }}
              </button>
              <button
                type="button"
                class="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                v-wave
                @click="saveWorkspace"
              >
                {{ t('admin.achievements.actions.save') }}
              </button>
              <button
                type="button"
                class="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                v-wave
                @click="loadWorkspace"
              >
                {{ t('admin.achievements.actions.load') }}
              </button>
            </div>
            <div class="mt-2 text-xs">
              <p
                v-if="builderMessage"
                class="text-emerald-600"
              >
                {{ builderMessage }}
              </p>
              <p
                v-if="builderError"
                class="text-red-600"
              >
                {{ builderError }}
              </p>
            </div>
          </div>

          <div class="rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div class="flex flex-col gap-4">
              <div>
                <label class="text-sm font-medium text-gray-700">
                  {{ t('admin.achievements.form.badgeLabel') }}
                </label>
                <div class="mt-2 flex items-center gap-3">
                  <img
                    v-if="currentPreviewImage"
                    :src="currentPreviewImage"
                    alt=""
                    class="h-20 w-20 rounded border border-gray-200 object-cover"
                  />
                  <div
                    v-else
                    class="rounded border border-dashed border-gray-300 px-3 py-6 text-xs text-gray-500"
                  >
                    {{ t('admin.achievements.form.badgePlaceholder') }}
                  </div>
                </div>
                <input
                  ref="badgeInputRef"
                  type="file"
                  accept="image/png"
                  class="mt-2 text-sm"
                  @change="handleBadgeChange"
                />
                <p class="text-xs text-gray-500">
                  {{ t('admin.achievements.form.badgeHint') }}
                </p>
              </div>

              <div class="space-y-3">
                <div
                  v-for="lang in contentLanguages"
                  :key="lang.code"
                  class="rounded-lg border border-gray-100 p-3"
                >
                  <p class="text-xs font-semibold uppercase text-gray-500">
                    {{ lang.label }}
                  </p>
                  <input
                    v-model="contentForm[lang.code].title"
                    type="text"
                    class="mt-2 w-full rounded border border-gray-200 px-2 py-1 text-sm"
                    :placeholder="
                      t('admin.achievements.form.translationTitlePlaceholder')
                    "
                  />
                  <textarea
                    v-model="contentForm[lang.code].description"
                    class="mt-2 w-full rounded border border-gray-200 px-2 py-1 text-sm"
                    rows="3"
                    :placeholder="
                      t(
                        'admin.achievements.form.translationDescriptionPlaceholder'
                      )
                    "
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
