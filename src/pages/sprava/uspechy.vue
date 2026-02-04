<route lang="yaml">
meta:
  layout: desktop/center
</route>

<script setup vapor lang="ts">
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

const schemaTableMap = schemaTables.reduce<Record<string, SchemaTable>>(
  (acc, table) => {
    acc[table.name] = table;
    return acc;
  },
  {}
);

type TableBuilderField = {
  id: string;
  table: string;
  column: string;
  alias: string;
  aggregation: string;
  sort: '' | 'ASC' | 'DESC';
  criteria: string[];
  orCriteria: string[];
  output: boolean;
};

type TableBuilderJoin = {
  id: string;
  type: string;
  leftTable: string;
  leftColumn: string;
  rightTable: string;
  rightColumn: string;
};

type TableCardLayout = {
  x: number;
  y: number;
};

type TableCardPosition = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  columnOffsets: Record<string, number>;
};

type DragState = {
  mode: 'column' | 'table';
  sourceTable: string;
  sourceColumn: string;
  startX: number;
  startY: number;
  mouseX: number;
  mouseY: number;
} | null;

type JoinPopupState = {
  visible: boolean;
  x: number;
  y: number;
  leftTable: string;
  leftColumn: string;
  rightTable: string;
  rightColumn: string;
} | null;

const queryBuilderMode = ref<'blockly' | 'table'>('blockly');
const tableBuilderDistinct = ref(false);
const tableBuilderLimit = ref(0);
const tableBuilderSelectedTables = ref<string[]>([]);
const tableBuilderMessage = ref<string | null>(null);
const tableBuilderError = ref<string | null>(null);
const tableBuilderTableToAdd = ref('');
const designSurfaceRef = ref<HTMLElement | null>(null);
const tableCardRefs = ref<Record<string, HTMLElement | null>>({});
const tableCardPositions = ref<Record<string, TableCardPosition>>({});
const tableCardLayouts = ref<Record<string, TableCardLayout>>({});
const dragState = ref<DragState>(null);
const joinPopup = ref<JoinPopupState>(null);
const designSurfaceHeight = ref(250);
const isResizingSurface = ref(false);

const firstSelectedTable = computed(
  () => tableBuilderSelectedTables.value[0] ?? ''
);

const tableBuilderSortOptions = [
  { labelKey: 'admin.achievements.tableBuilder.sort.none', value: '' },
  { labelKey: 'admin.achievements.tableBuilder.sort.asc', value: 'ASC' },
  { labelKey: 'admin.achievements.tableBuilder.sort.desc', value: 'DESC' }
] as const;

let tableBuilderIdCounter = 0;
const nextTableBuilderId = (prefix: string) =>
  `${prefix}-${Date.now()}-${tableBuilderIdCounter++}`;

const addTableToSurface = (tableName: string) => {
  if (!tableName) return;
  if (!tableBuilderSelectedTables.value.includes(tableName)) {
    tableBuilderSelectedTables.value = [
      ...tableBuilderSelectedTables.value,
      tableName
    ];
    nextTick(() => updateTableCardPositions());
  }
};

const ensureFieldColumn = (field: TableBuilderField) => {
  const columns = schemaTableMap[field.table]?.columns ?? [];
  if (!columns.includes(field.column)) {
    field.column = columns[0] ?? '';
  }
};

const ensureJoinColumn = (join: TableBuilderJoin, side: 'left' | 'right') => {
  const tableName = side === 'left' ? join.leftTable : join.rightTable;
  const columns = schemaTableMap[tableName]?.columns ?? [];
  const currentValue = side === 'left' ? join.leftColumn : join.rightColumn;
  if (!columns.includes(currentValue)) {
    if (side === 'left') {
      join.leftColumn = columns[0] ?? '';
    } else {
      join.rightColumn = columns[0] ?? '';
    }
  }
};

const createTableBuilderField = (
  init?: Partial<TableBuilderField>
): TableBuilderField => {
  const table =
    init?.table || firstSelectedTable.value || schemaTables[0]?.name || '';
  const field: TableBuilderField = {
    id: init?.id || nextTableBuilderId('field'),
    table,
    column: init?.column || schemaTableMap[table]?.columns[0] || '',
    alias: init?.alias ?? '',
    aggregation: init?.aggregation ?? 'RAW',
    sort: init?.sort ?? '',
    criteria: init?.criteria ?? [''],
    orCriteria: init?.orCriteria ?? [''],
    output: init?.output ?? true
  };
  addTableToSurface(table);
  ensureFieldColumn(field);
  return field;
};

const createTableBuilderJoin = (
  init?: Partial<TableBuilderJoin>
): TableBuilderJoin => {
  const leftTable = init?.leftTable || firstSelectedTable.value || '';
  const rightTable =
    init?.rightTable ||
    tableBuilderSelectedTables.value.find((name) => name !== leftTable) ||
    leftTable;
  const join: TableBuilderJoin = {
    id: init?.id || nextTableBuilderId('join'),
    type: init?.type || 'INNER',
    leftTable,
    leftColumn: init?.leftColumn || schemaTableMap[leftTable]?.columns[0] || '',
    rightTable,
    rightColumn:
      init?.rightColumn || schemaTableMap[rightTable]?.columns[0] || ''
  };
  addTableToSurface(leftTable);
  addTableToSurface(rightTable);
  ensureJoinColumn(join, 'left');
  ensureJoinColumn(join, 'right');
  return join;
};

const tableBuilderFields = ref<TableBuilderField[]>([
  createTableBuilderField()
]);
const tableBuilderJoins = ref<TableBuilderJoin[]>([]);

const resolveTableColumns = (tableName: string) =>
  schemaTableMap[tableName]?.columns ?? [];
const resolveTableAlias = (tableName: string) =>
  schemaTableMap[tableName]?.alias ?? tableName;

const addTableBuilderField = () => {
  tableBuilderFields.value = [
    ...tableBuilderFields.value,
    createTableBuilderField()
  ];
};

const removeTableBuilderField = (id: string) => {
  if (tableBuilderFields.value.length === 1) {
    tableBuilderFields.value = [createTableBuilderField()];
    return;
  }
  tableBuilderFields.value = tableBuilderFields.value.filter(
    (field) => field.id !== id
  );
};

const removeTableBuilderJoin = (id: string) => {
  tableBuilderJoins.value = tableBuilderJoins.value.filter(
    (join) => join.id !== id
  );
};

const handleFieldTableChange = (field: TableBuilderField) => {
  addTableToSurface(field.table);
  ensureFieldColumn(field);
};

const addTableToSelection = () => {
  if (!tableBuilderTableToAdd.value) return;
  addTableToSurface(tableBuilderTableToAdd.value);
  tableBuilderTableToAdd.value = '';
};

const removeTableFromSurface = (tableName: string) => {
  if (!tableName) return;
  tableBuilderSelectedTables.value = tableBuilderSelectedTables.value.filter(
    (name) => name !== tableName
  );
  tableBuilderJoins.value = tableBuilderJoins.value.filter(
    (join) => join.leftTable !== tableName && join.rightTable !== tableName
  );
  tableBuilderFields.value = tableBuilderFields.value.filter(
    (field) => field.table !== tableName
  );
  if (tableBuilderFields.value.length === 0 && firstSelectedTable.value) {
    tableBuilderFields.value = [
      createTableBuilderField({ table: firstSelectedTable.value })
    ];
  }
  nextTick(() => updateTableCardPositions());
};

const getDefaultTableLayout = (index: number): TableCardLayout => ({
  x: 16 + (index % 4) * 180,
  y: 16 + Math.floor(index / 4) * 180
});

const ensureTableLayout = (tableName: string) => {
  if (!tableCardLayouts.value[tableName]) {
    const idx = tableBuilderSelectedTables.value.indexOf(tableName);
    tableCardLayouts.value[tableName] = getDefaultTableLayout(
      idx >= 0 ? idx : Object.keys(tableCardLayouts.value).length
    );
  }
};

const updateTableCardPositions = () => {
  if (!designSurfaceRef.value) return;
  const surfaceRect = designSurfaceRef.value.getBoundingClientRect();
  const positions: Record<string, TableCardPosition> = {};
  tableBuilderSelectedTables.value.forEach((tableName) => {
    ensureTableLayout(tableName);
    const cardEl = tableCardRefs.value[tableName];
    if (!cardEl) return;
    const layout = tableCardLayouts.value[tableName];
    const cardRect = cardEl.getBoundingClientRect();
    const columnOffsets: Record<string, number> = {};
    const columnEls = cardEl.querySelectorAll('[data-column]');
    columnEls.forEach((el) => {
      const column = (el as HTMLElement).dataset['column'];
      if (column) {
        const elRect = el.getBoundingClientRect();
        columnOffsets[column] =
          elRect.top - surfaceRect.top + elRect.height / 2;
      }
    });
    positions[tableName] = {
      name: tableName,
      x: layout?.x ?? 0,
      y: layout?.y ?? 0,
      width: cardRect.width,
      height: cardRect.height,
      columnOffsets
    };
  });
  tableCardPositions.value = positions;
};

const getJoinLineData = (join: TableBuilderJoin) => {
  const leftPos = tableCardPositions.value[join.leftTable];
  const rightPos = tableCardPositions.value[join.rightTable];
  if (!leftPos || !rightPos) return null;

  const leftColumnY = leftPos.columnOffsets[join.leftColumn] ?? leftPos.y + 40;
  const rightColumnY =
    rightPos.columnOffsets[join.rightColumn] ?? rightPos.y + 40;

  // Determine which side to connect based on relative positions
  let leftX: number, rightX: number;
  if (leftPos.x + leftPos.width < rightPos.x) {
    // Left table is to the left of right table
    leftX = leftPos.x + leftPos.width;
    rightX = rightPos.x;
  } else if (rightPos.x + rightPos.width < leftPos.x) {
    // Right table is to the left of left table
    leftX = leftPos.x;
    rightX = rightPos.x + rightPos.width;
  } else {
    // Tables overlap horizontally, connect from closest edges
    leftX = leftPos.x + leftPos.width / 2;
    rightX = rightPos.x + rightPos.width / 2;
  }

  const midX = (leftX + rightX) / 2;
  const midY = (leftColumnY + rightColumnY) / 2;
  const path = `M ${leftX} ${leftColumnY} C ${midX} ${leftColumnY}, ${midX} ${rightColumnY}, ${rightX} ${rightColumnY}`;

  return {
    path,
    midX,
    midY,
    leftX,
    leftY: leftColumnY,
    rightX,
    rightY: rightColumnY
  };
};

const getJoinTypeSymbol = (joinType: string) => {
  switch (joinType) {
    case 'INNER':
      return '⋈';
    case 'LEFT':
      return '⟕';
    case 'RIGHT':
      return '⟖';
    case 'FULL':
      return '⟗';
    case 'CROSS':
      return '×';
    default:
      return '⋈';
  }
};

// Table dragging handlers
const handleTableDragStart = (event: MouseEvent, tableName: string) => {
  // Ensure layout exists before dragging
  ensureTableLayout(tableName);
  const layout = tableCardLayouts.value[tableName];
  if (!layout) return;

  dragState.value = {
    mode: 'table',
    sourceTable: tableName,
    sourceColumn: '',
    startX: layout.x,
    startY: layout.y,
    mouseX: event.clientX,
    mouseY: event.clientY
  };

  // Use capture phase for more reliable event handling
  document.addEventListener('mousemove', handleTableDragMove, {
    capture: true
  });
  document.addEventListener('mouseup', handleTableDragEnd, { capture: true });
};

const handleTableDragMove = (event: MouseEvent) => {
  if (!dragState.value || dragState.value.mode !== 'table') return;
  event.preventDefault();
  event.stopPropagation();

  const dx = event.clientX - dragState.value.mouseX;
  const dy = event.clientY - dragState.value.mouseY;

  tableCardLayouts.value = {
    ...tableCardLayouts.value,
    [dragState.value.sourceTable]: {
      x: Math.max(0, dragState.value.startX + dx),
      y: Math.max(0, dragState.value.startY + dy)
    }
  };
  nextTick(() => updateTableCardPositions());
};

const handleTableDragEnd = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();

  document.removeEventListener('mousemove', handleTableDragMove, {
    capture: true
  });
  document.removeEventListener('mouseup', handleTableDragEnd, {
    capture: true
  });

  if (dragState.value?.mode === 'table') {
    dragState.value = null;
  }
};

// Column dragging handlers (for joins)
const handleColumnDragStart = (
  event: DragEvent,
  tableName: string,
  column: string
) => {
  event.dataTransfer?.setData('text/plain', `${tableName}:${column}`);
  dragState.value = {
    mode: 'column',
    sourceTable: tableName,
    sourceColumn: column,
    startX: 0,
    startY: 0,
    mouseX: event.clientX,
    mouseY: event.clientY
  };
};

const handleColumnDragOver = (event: DragEvent) => {
  event.preventDefault();
  if (dragState.value && dragState.value.mode === 'column') {
    dragState.value.mouseX = event.clientX;
    dragState.value.mouseY = event.clientY;
  }
};

const handleColumnDrop = (
  event: DragEvent,
  targetTable: string,
  targetColumn: string
) => {
  event.preventDefault();
  if (!dragState.value || dragState.value.mode !== 'column') return;
  const { sourceTable, sourceColumn } = dragState.value;
  if (sourceTable === targetTable) {
    dragState.value = null;
    return;
  }
  const surfaceRect = designSurfaceRef.value?.getBoundingClientRect();
  joinPopup.value = {
    visible: true,
    x: surfaceRect ? event.clientX - surfaceRect.left : event.clientX,
    y: surfaceRect ? event.clientY - surfaceRect.top : event.clientY,
    leftTable: sourceTable,
    leftColumn: sourceColumn,
    rightTable: targetTable,
    rightColumn: targetColumn
  };
  dragState.value = null;
};

const handleColumnDragEnd = () => {
  if (dragState.value?.mode === 'column') {
    dragState.value = null;
  }
};

// Surface resize handlers
const handleSurfaceResizeStart = (event: MouseEvent) => {
  event.preventDefault();
  isResizingSurface.value = true;
  const startY = event.clientY;
  const startHeight = designSurfaceHeight.value;

  const handleMove = (e: MouseEvent) => {
    const dy = e.clientY - startY;
    designSurfaceHeight.value = Math.max(150, Math.min(600, startHeight + dy));
  };

  const handleEnd = () => {
    isResizingSurface.value = false;
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', handleEnd);
  };

  document.addEventListener('mousemove', handleMove);
  document.addEventListener('mouseup', handleEnd);
};

const confirmJoinFromPopup = (joinType: string) => {
  if (!joinPopup.value) return;
  const newJoin = createTableBuilderJoin({
    leftTable: joinPopup.value.leftTable,
    leftColumn: joinPopup.value.leftColumn,
    rightTable: joinPopup.value.rightTable,
    rightColumn: joinPopup.value.rightColumn,
    type: joinType
  });
  tableBuilderJoins.value = [...tableBuilderJoins.value, newJoin];
  joinPopup.value = null;
  nextTick(() => updateTableCardPositions());
};

const cancelJoinPopup = () => {
  joinPopup.value = null;
};

const addFieldFromColumn = (tableName: string, column: string) => {
  const newField = createTableBuilderField({
    table: tableName,
    column
  });
  tableBuilderFields.value = [...tableBuilderFields.value, newField];
};

// Criteria rows management
const maxCriteriaRows = computed(() => {
  let max = 1;
  tableBuilderFields.value.forEach((field) => {
    if (field.criteria.length > max) {
      max = field.criteria.length;
    }
  });
  return max;
});

const maxOrCriteriaRows = computed(() => {
  let max = 1;
  tableBuilderFields.value.forEach((field) => {
    if (field.orCriteria.length > max) {
      max = field.orCriteria.length;
    }
  });
  return max;
});

const addCriteriaRow = () => {
  tableBuilderFields.value.forEach((field) => {
    field.criteria = [...field.criteria, ''];
  });
};

const addOrCriteriaRow = () => {
  tableBuilderFields.value.forEach((field) => {
    field.orCriteria = [...field.orCriteria, ''];
  });
};

const updateFieldCriteria = (
  field: TableBuilderField,
  index: number,
  value: string
) => {
  while (field.criteria.length <= index) {
    field.criteria.push('');
  }
  field.criteria[index] = value;
};

const updateFieldOrCriteria = (
  field: TableBuilderField,
  index: number,
  value: string
) => {
  while (field.orCriteria.length <= index) {
    field.orCriteria.push('');
  }
  field.orCriteria[index] = value;
};

const tableBuilderSelectedTableDetails = computed(() =>
  tableBuilderSelectedTables.value
    .map((name) => schemaTableMap[name])
    .filter((table): table is SchemaTable => Boolean(table))
);

const tableBuilderAvailableTables = computed(() => {
  const selected = new Set(tableBuilderSelectedTables.value);
  return schemaTables.filter((table) => !selected.has(table.name));
});

const resetTableBuilderFeedback = () => {
  tableBuilderMessage.value = null;
  tableBuilderError.value = null;
};

const applyAggregationExpression = (expr: string, aggregation: string) => {
  switch (aggregation) {
    case 'COUNT':
      return `COUNT(${expr})`;
    case 'COUNT_DISTINCT':
      return `COUNT(DISTINCT ${expr})`;
    case 'SUM':
      return `SUM(${expr})`;
    case 'AVG':
      return `AVG(${expr})`;
    case 'MIN':
      return `MIN(${expr})`;
    case 'MAX':
      return `MAX(${expr})`;
    default:
      return expr;
  }
};

const buildBooleanClause = (andParts: string[], orParts: string[]) => {
  const andClause = andParts.length ? `(${andParts.join(' AND ')})` : '';
  const orClause = orParts.length ? `(${orParts.join(' OR ')})` : '';
  if (andClause && orClause) {
    return `${andClause} OR ${orClause}`;
  }
  return andClause || orClause;
};

const buildTableBuilderSQL = () => {
  const baseTable = firstSelectedTable.value;
  if (!baseTable) {
    return '';
  }
  const baseDefinition = schemaTableMap[baseTable];
  if (!baseDefinition) {
    return '';
  }
  const selectParts: string[] = [];
  const orderByParts: string[] = [];
  const whereAndClauses: string[] = [];
  const whereOrClauses: string[] = [];
  const havingAndClauses: string[] = [];
  const havingOrClauses: string[] = [];
  const groupBySet = new Set<string>();
  let usesAggregation = false;
  let hasOutput = false;

  tableBuilderFields.value.forEach((field) => {
    if (!field.table || !field.column) {
      return;
    }
    const alias = resolveTableAlias(field.table);
    if (!alias) return;
    const expr = `${alias}.${field.column}`;
    const aggregatedExpr = applyAggregationExpression(expr, field.aggregation);
    if (field.output) {
      hasOutput = true;
      let projection = aggregatedExpr;
      if (field.alias.trim()) {
        projection += ` AS ${sanitizeIdentifier(field.alias)}`;
      }
      selectParts.push(projection);
    }
    if (field.aggregation !== 'RAW') {
      usesAggregation = true;
    } else if (
      field.output ||
      field.criteria.some((c) => c.trim()) ||
      field.orCriteria.some((c) => c.trim())
    ) {
      groupBySet.add(expr);
    }
    if (field.sort) {
      orderByParts.push(`${aggregatedExpr} ${field.sort}`);
    }
    // Process all criteria (AND conditions)
    field.criteria.forEach((criterion) => {
      const trimmed = criterion.trim();
      if (trimmed) {
        const target = field.aggregation === 'RAW' ? expr : aggregatedExpr;
        (field.aggregation === 'RAW' ? whereAndClauses : havingAndClauses).push(
          `${target} ${trimmed}`
        );
      }
    });
    // Process all OR criteria
    field.orCriteria.forEach((criterion) => {
      const trimmed = criterion.trim();
      if (trimmed) {
        const target = field.aggregation === 'RAW' ? expr : aggregatedExpr;
        (field.aggregation === 'RAW' ? whereOrClauses : havingOrClauses).push(
          `${target} ${trimmed}`
        );
      }
    });
  });

  if (!hasOutput) {
    return '';
  }

  // Build the FROM clause with proper join ordering
  // Track which tables have been included in the query
  const includedTables = new Set<string>([baseTable]);

  let sql = `SELECT${tableBuilderDistinct.value ? ' DISTINCT' : ''} ${
    selectParts.length ? selectParts.join(', ') : '*'
  }\nFROM ${baseDefinition.name} ${baseDefinition.alias}\n`;

  // Process joins - need to order them so each join references an already-included table
  const pendingJoins = [...tableBuilderJoins.value];
  const processedJoins = new Set<string>();
  let maxIterations = pendingJoins.length * 2;

  while (pendingJoins.length > 0 && maxIterations > 0) {
    maxIterations--;
    const joinIndex = pendingJoins.findIndex((j) => {
      // A join can be processed if at least one of its tables is already included
      return (
        includedTables.has(j.leftTable) || includedTables.has(j.rightTable)
      );
    });

    if (joinIndex === -1) break; // No more processable joins

    const joinItem = pendingJoins.splice(joinIndex, 1)[0];
    if (!joinItem || processedJoins.has(joinItem.id)) continue;
    processedJoins.add(joinItem.id);

    // Determine which table to join (the one not yet included)
    let fromTable: string,
      toTable: string,
      fromColumn: string,
      toColumn: string;
    if (
      includedTables.has(joinItem.leftTable) &&
      !includedTables.has(joinItem.rightTable)
    ) {
      fromTable = joinItem.leftTable;
      toTable = joinItem.rightTable;
      fromColumn = joinItem.leftColumn;
      toColumn = joinItem.rightColumn;
    } else if (
      includedTables.has(joinItem.rightTable) &&
      !includedTables.has(joinItem.leftTable)
    ) {
      fromTable = joinItem.rightTable;
      toTable = joinItem.leftTable;
      fromColumn = joinItem.rightColumn;
      toColumn = joinItem.leftColumn;
    } else if (
      includedTables.has(joinItem.leftTable) &&
      includedTables.has(joinItem.rightTable)
    ) {
      // Both tables already included - this is an additional condition, skip for now
      // In a full implementation, this could add to WHERE clause
      continue;
    } else {
      // Neither table included yet - defer this join
      pendingJoins.push(joinItem);
      continue;
    }

    const toDefinition = schemaTableMap[toTable];
    if (!toDefinition) continue;

    const fromAlias = resolveTableAlias(fromTable);
    const toAlias = resolveTableAlias(toTable);
    if (!fromAlias || !toAlias) continue;

    includedTables.add(toTable);

    if (joinItem.type === 'CROSS') {
      sql += `CROSS JOIN ${toDefinition.name} ${toAlias}\n`;
    } else {
      const joinType = joinItem.type || 'INNER';
      sql += `${joinType} JOIN ${toDefinition.name} ${toAlias} ON ${fromAlias}.${fromColumn} = ${toAlias}.${toColumn}\n`;
    }
  }

  const whereClause = buildBooleanClause(whereAndClauses, whereOrClauses);
  if (whereClause) {
    sql += `WHERE ${whereClause}\n`;
  }

  if (usesAggregation && groupBySet.size) {
    sql += `GROUP BY ${Array.from(groupBySet).join(', ')}\n`;
  }

  const havingClause = buildBooleanClause(havingAndClauses, havingOrClauses);
  if (havingClause) {
    sql += `HAVING ${havingClause}\n`;
  }

  if (orderByParts.length) {
    sql += `ORDER BY ${orderByParts.join(', ')}\n`;
  }

  if (tableBuilderLimit.value > 0) {
    sql += `LIMIT ${Math.floor(tableBuilderLimit.value)}\n`;
  }

  sql += ';\n';
  return sql;
};

const tableBuilderSqlPreview = computed(() => buildTableBuilderSQL());
const hasTableBuilderPreview = computed(() =>
  Boolean(tableBuilderSqlPreview.value.trim())
);

const applyTableBuilderSqlToEditor = () => {
  if (!hasTableBuilderPreview.value) {
    tableBuilderError.value = t('admin.achievements.tableBuilder.previewEmpty');
    tableBuilderMessage.value = null;
    return;
  }
  generatedSQL.value = tableBuilderSqlPreview.value.trim();
  tableBuilderMessage.value = t('admin.achievements.tableBuilder.applied');
  tableBuilderError.value = null;
};

watch(
  [
    tableBuilderFields,
    tableBuilderJoins,
    tableBuilderSelectedTables,
    tableBuilderDistinct,
    tableBuilderLimit
  ],
  () => {
    resetTableBuilderFeedback();
  },
  { deep: true }
);

watch(
  tableBuilderSelectedTables,
  () => {
    nextTick(() => updateTableCardPositions());
  },
  { deep: true }
);

watch(tableBuilderLimit, (limit) => {
  if (!Number.isFinite(limit) || limit < 0) {
    tableBuilderLimit.value = 0;
  }
});

watch(queryBuilderMode, (mode) => {
  if (mode === 'blockly') {
    nextTick(() => {
      resizeWorkspace();
    });
  }
});
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

const SQL = new Blockly.Generator('ACH_SQL');

SQL.forBlock['achievement_column'] = function (block: Block) {
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

SQL.forBlock['achievement_join'] = function (block: Block) {
  const joinType = block.getFieldValue('TYPE') || 'INNER';
  const table = block.getFieldValue('TABLE') || 'recordings';
  const alias = sanitizeIdentifier(block.getFieldValue('ALIAS') || '');
  const onClause = block.getFieldValue('ON')?.trim() || '1 = 1';
  if (joinType === 'CROSS') {
    return `CROSS JOIN ${table}${alias ? ` ${alias}` : ''}\n`;
  }
  return `${joinType} JOIN ${table}${alias ? ` ${alias}` : ''} ON ${onClause}\n`;
};

SQL.forBlock['achievement_where'] = function (block: Block) {
  const clause = buildComparison(
    block.getFieldValue('LEFT') || '',
    block.getFieldValue('OP') || '=',
    block.getFieldValue('VALUE') || '',
    block.getFieldValue('VALUE_TYPE') || 'STRING'
  );
  if (!clause) return '';
  return `${clause} AND `;
};

SQL.forBlock['achievement_having'] = SQL.forBlock['achievement_where'];

SQL.forBlock['achievement_group_by'] = function (block: Block) {
  const expr = sanitizeIdentifier(block.getFieldValue('EXPR') || '');
  if (!expr) return '';
  return expr + ', ';
};

SQL.forBlock['achievement_select'] = function (
  block: Block,
  generator: Blockly.Generator
) {
  let columnsCode = generator.statementToCode(block, 'COLUMNS') || '';
  columnsCode = columnsCode.replace(/,\s*$/, '');
  if (!columnsCode.trim()) {
    columnsCode = '*';
  }
  const table = block.getFieldValue('TABLE') || 'recordings';
  const alias = sanitizeIdentifier(block.getFieldValue('BASE_ALIAS') || '');
  let joinsCode = generator.statementToCode(block, 'JOINS') || '';
  let whereCode = generator.statementToCode(block, 'WHERE') || '';
  whereCode = whereCode.replace(/\s*AND\s*$/i, '').trim();
  let groupByCode = generator.statementToCode(block, 'GROUP_BY') || '';
  groupByCode = groupByCode.replace(/,\s*$/, '').trim();
  let havingCode = generator.statementToCode(block, 'HAVING') || '';
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
    scrollbars: false,
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
                @click="openAchievementInEditor(achievement)"
              >
                {{ t('admin.achievements.list.openEditor') }}
              </button>
              <button
                type="button"
                class="rounded border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-white"
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
                  @click="switchEditor(index)"
                >
                  {{ editor.title }}
                </button>
                <button
                  type="button"
                  class="rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
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
              class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div
                class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3"
              >
                <div>
                  <p class="text-sm font-semibold">
                    {{ t('admin.achievements.builder.title') }}
                  </p>
                  <p class="text-xs text-gray-500">
                    {{
                      queryBuilderMode === 'blockly'
                        ? t(
                            'admin.achievements.tableBuilder.blocklyDescription'
                          )
                        : t('admin.achievements.tableBuilder.tableDescription')
                    }}
                  </p>
                </div>
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="rounded-full px-3 py-1 text-xs font-semibold"
                    :class="
                      queryBuilderMode === 'blockly'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    "
                    @click="queryBuilderMode = 'blockly'"
                  >
                    {{ t('admin.achievements.tableBuilder.modeBlocks') }}
                  </button>
                  <button
                    type="button"
                    class="rounded-full px-3 py-1 text-xs font-semibold"
                    :class="
                      queryBuilderMode === 'table'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    "
                    @click="queryBuilderMode = 'table'"
                  >
                    {{ t('admin.achievements.tableBuilder.modeTable') }}
                  </button>
                </div>
              </div>

              <div class="space-y-4 pt-4">
                <div
                  v-show="queryBuilderMode === 'blockly'"
                  ref="blocklyArea"
                  class="relative h-[520px] w-full overflow-hidden rounded-xl border border-dashed border-gray-200 bg-white"
                >
                  <div
                    ref="blocklyDiv"
                    class="h-full w-full"
                  />
                </div>

                <div
                  v-show="queryBuilderMode === 'table'"
                  class="flex flex-col"
                >
                  <!-- MS Access-style Design Surface -->
                  <div
                    class="flex flex-col rounded-xl border border-gray-300 bg-[#e8e8e8]"
                  >
                    <!-- Table Cards Area with SVG overlay for join lines -->
                    <div
                      class="relative border-b border-gray-400 bg-gradient-to-b from-[#f0f0f0] to-[#d8d8d8]"
                    >
                      <!-- Toolbar -->
                      <div
                        class="flex items-center gap-2 border-b border-gray-300 bg-gradient-to-b from-[#f5f5f5] to-[#e0e0e0] px-2 py-1"
                      >
                        <select
                          v-model="tableBuilderTableToAdd"
                          class="rounded border border-gray-400 bg-white px-2 py-0.5 text-xs shadow-sm"
                        >
                          <option value="">
                            {{
                              t(
                                'admin.achievements.tableBuilder.tables.placeholder'
                              )
                            }}
                          </option>
                          <option
                            v-for="table in tableBuilderAvailableTables"
                            :key="table.name"
                            :value="table.name"
                          >
                            {{ table.label }}
                          </option>
                        </select>
                        <button
                          type="button"
                          class="rounded border border-gray-400 bg-gradient-to-b from-white to-gray-100 px-2 py-0.5 text-xs font-medium shadow-sm hover:from-gray-50 hover:to-gray-200 disabled:opacity-50"
                          :disabled="!tableBuilderTableToAdd"
                          @click="addTableToSelection"
                        >
                          {{ t('admin.achievements.tableBuilder.palette.add') }}
                        </button>
                        <div
                          class="ml-auto flex items-center gap-3 text-xs text-gray-600"
                        >
                          <label class="flex items-center gap-1">
                            <input
                              v-model="tableBuilderDistinct"
                              type="checkbox"
                              class="h-3 w-3"
                            />
                            DISTINCT
                          </label>
                          <label class="flex items-center gap-1">
                            LIMIT
                            <input
                              v-model.number="tableBuilderLimit"
                              type="number"
                              min="0"
                              class="w-14 rounded border border-gray-400 bg-white px-1 py-0.5 text-xs"
                            />
                          </label>
                        </div>
                      </div>

                      <!-- Design Surface with table cards -->
                      <div
                        ref="designSurfaceRef"
                        class="relative overflow-auto"
                        :style="{ height: designSurfaceHeight + 'px' }"
                        @dragover="handleColumnDragOver"
                      >
                        <!-- SVG layer for join lines with type indicators -->
                        <div
                          class="pointer-events-none absolute inset-0 select-none"
                          style="z-index: 0"
                        >
                          <svg
                            class="h-full w-full"
                            style="pointer-events: none"
                          >
                            <g
                              v-for="join in tableBuilderJoins"
                              :key="join.id"
                            >
                              <template v-if="getJoinLineData(join)">
                                <!-- Join line -->
                                <path
                                  :d="getJoinLineData(join)!.path"
                                  fill="none"
                                  stroke="#1a56db"
                                  stroke-width="2"
                                  stroke-linecap="round"
                                  style="pointer-events: none"
                                />
                                <!-- Join type label background -->
                                <rect
                                  :x="getJoinLineData(join)!.midX - 18"
                                  :y="getJoinLineData(join)!.midY - 10"
                                  width="36"
                                  height="20"
                                  rx="4"
                                  fill="white"
                                  stroke="#1a56db"
                                  stroke-width="1"
                                  style="pointer-events: none"
                                />
                                <!-- Join type label -->
                                <text
                                  :x="getJoinLineData(join)!.midX"
                                  :y="getJoinLineData(join)!.midY + 4"
                                  text-anchor="middle"
                                  class="select-none"
                                  style="
                                    font-size: 10px;
                                    font-weight: bold;
                                    pointer-events: none;
                                  "
                                  fill="#1a56db"
                                >
                                  {{ join.type || 'INNER' }}
                                </text>
                                <!-- Cardinality indicators -->
                                <text
                                  :x="getJoinLineData(join)!.leftX + 8"
                                  :y="getJoinLineData(join)!.leftY - 6"
                                  class="select-none"
                                  style="font-size: 9px; pointer-events: none"
                                  fill="#666"
                                >
                                  1
                                </text>
                                <text
                                  :x="getJoinLineData(join)!.rightX - 12"
                                  :y="getJoinLineData(join)!.rightY - 6"
                                  class="select-none"
                                  style="font-size: 9px; pointer-events: none"
                                  fill="#666"
                                >
                                  ∞
                                </text>
                              </template>
                            </g>
                            <!-- Drag preview line -->
                            <line
                              v-if="dragState && dragState.mode === 'column'"
                              :x1="
                                (tableCardPositions[dragState.sourceTable]?.x ??
                                  0) +
                                (tableCardPositions[dragState.sourceTable]
                                  ?.width ?? 0)
                              "
                              :y1="
                                tableCardPositions[dragState.sourceTable]
                                  ?.columnOffsets[dragState.sourceColumn] ?? 0
                              "
                              :x2="
                                dragState.mouseX -
                                (designSurfaceRef?.getBoundingClientRect()
                                  .left ?? 0)
                              "
                              :y2="
                                dragState.mouseY -
                                (designSurfaceRef?.getBoundingClientRect()
                                  .top ?? 0)
                              "
                              stroke="#9ca3af"
                              stroke-width="2"
                              stroke-dasharray="4"
                              style="pointer-events: none"
                            />
                          </svg>
                        </div>

                        <!-- Empty state -->
                        <div
                          v-if="!tableBuilderSelectedTableDetails.length"
                          class="flex h-full items-center justify-center text-sm text-gray-500"
                        >
                          {{
                            t('admin.achievements.tableBuilder.surface.empty')
                          }}
                        </div>

                        <!-- Table Cards (absolutely positioned for free dragging) -->
                        <div
                          v-for="table in tableBuilderSelectedTableDetails"
                          :key="table.name"
                          :ref="
                            (el) =>
                              (tableCardRefs[table.name] = el as HTMLElement)
                          "
                          class="absolute w-40 rounded border border-gray-500 bg-white shadow-md select-none"
                          :style="{
                            left: (tableCardLayouts[table.name]?.x ?? 0) + 'px',
                            top: (tableCardLayouts[table.name]?.y ?? 0) + 'px',
                            zIndex:
                              dragState?.mode === 'table' &&
                              dragState.sourceTable === table.name
                                ? 50
                                : 20
                          }"
                        >
                          <!-- Table header (Access-style blue title bar) - draggable -->
                          <div
                            class="flex cursor-grab items-center justify-between bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] px-2 py-1 text-white active:cursor-grabbing"
                            @mousedown.stop.prevent="
                              handleTableDragStart($event, table.name)
                            "
                          >
                            <span
                              class="truncate text-xs font-bold pointer-events-none"
                              >{{ table.label }}</span
                            >
                            <button
                              type="button"
                              class="ml-1 text-[10px] text-white/70 hover:text-white pointer-events-auto"
                              @click.stop.prevent="
                                removeTableFromSurface(table.name)
                              "
                              @mousedown.stop
                            >
                              ✕
                            </button>
                          </div>
                          <!-- Column list -->
                          <ul class="max-h-32 overflow-y-auto text-[11px]">
                            <li
                              v-for="column in table.columns"
                              :key="`${table.name}-${column}`"
                              :data-column="column"
                              draggable="true"
                              class="cursor-grab border-b border-gray-100 px-2 py-0.5 hover:bg-blue-50"
                              @dragstart="
                                handleColumnDragStart(
                                  $event,
                                  table.name,
                                  column
                                )
                              "
                              @dragend="handleColumnDragEnd"
                              @drop="
                                handleColumnDrop($event, table.name, column)
                              "
                              @dragover.prevent
                              @dblclick="addFieldFromColumn(table.name, column)"
                            >
                              {{ column }}
                            </li>
                          </ul>
                        </div>

                        <!-- Join Type Popup -->
                        <div
                          v-if="joinPopup?.visible"
                          class="absolute rounded border border-gray-400 bg-white shadow-lg"
                          :style="{
                            left: joinPopup.x + 'px',
                            top: joinPopup.y + 'px',
                            zIndex: 100
                          }"
                        >
                          <div
                            class="border-b border-gray-200 bg-gray-100 px-3 py-1 text-xs font-bold"
                          >
                            {{
                              t(
                                'admin.achievements.tableBuilder.joins.selectType'
                              )
                            }}
                          </div>
                          <div class="flex flex-col py-1">
                            <button
                              v-for="[label, value] in joinTypeOptions"
                              :key="value"
                              type="button"
                              class="px-3 py-1 text-left text-xs hover:bg-blue-100"
                              @click="confirmJoinFromPopup(value)"
                            >
                              {{ getJoinTypeSymbol(value) }} {{ label }}
                            </button>
                          </div>
                          <div class="border-t border-gray-200 px-3 py-1">
                            <button
                              type="button"
                              class="text-xs text-gray-500 hover:text-gray-700"
                              @click="cancelJoinPopup"
                            >
                              {{ t('buttons.cancel') }}
                            </button>
                          </div>
                        </div>
                      </div>

                      <!-- Resize handle for surface -->
                      <div
                        class="h-2 cursor-ns-resize bg-gradient-to-b from-gray-200 to-gray-300 hover:from-blue-200 hover:to-blue-300"
                        @mousedown="handleSurfaceResizeStart"
                      ></div>

                      <!-- Joins list (for editing existing joins) -->
                      <div
                        v-if="tableBuilderJoins.length"
                        class="border-t border-gray-300 bg-gray-50 px-2 py-1"
                      >
                        <div class="flex flex-wrap gap-2 text-[10px]">
                          <div
                            v-for="join in tableBuilderJoins"
                            :key="join.id"
                            class="flex items-center gap-1 rounded bg-white px-2 py-0.5 shadow-sm"
                          >
                            <span class="font-medium"
                              >{{ resolveTableAlias(join.leftTable) }}.{{
                                join.leftColumn
                              }}</span
                            >
                            <select
                              v-model="join.type"
                              class="border-none bg-transparent px-1 text-[10px] font-bold text-blue-700"
                            >
                              <option
                                v-for="[, value] in joinTypeOptions"
                                :key="value"
                                :value="value"
                              >
                                {{ value }}
                              </option>
                            </select>
                            <span class="font-medium"
                              >{{ resolveTableAlias(join.rightTable) }}.{{
                                join.rightColumn
                              }}</span
                            >
                            <button
                              type="button"
                              class="ml-1 text-gray-400 hover:text-red-500"
                              @click="removeTableBuilderJoin(join.id)"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- QBE Grid (Access-style horizontal grid) -->
                    <div class="overflow-x-auto bg-white">
                      <table class="w-full border-collapse text-[11px]">
                        <!-- Each row is a property, each column is a field -->
                        <thead>
                          <tr class="border-b border-gray-300 bg-gray-100">
                            <th
                              class="w-24 border-r border-gray-300 px-2 py-1 text-left font-bold text-gray-700"
                            >
                              <!-- Row labels column -->
                            </th>
                            <th
                              v-for="field in tableBuilderFields"
                              :key="field.id"
                              class="min-w-[120px] border-r border-gray-300 px-1 py-1 text-center font-normal"
                            >
                              <button
                                type="button"
                                class="text-[10px] text-gray-400 hover:text-red-500"
                                @click="removeTableBuilderField(field.id)"
                              >
                                ✕
                              </button>
                            </th>
                            <th class="w-8 px-1">
                              <button
                                type="button"
                                class="rounded bg-gray-200 px-2 py-0.5 text-[10px] font-medium hover:bg-gray-300"
                                @click="addTableBuilderField"
                              >
                                +
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <!-- Field row -->
                          <tr class="border-b border-gray-200">
                            <td
                              class="border-r border-gray-300 bg-gray-50 px-2 py-1 font-medium text-gray-700"
                            >
                              {{
                                t(
                                  'admin.achievements.tableBuilder.fields.field'
                                )
                              }}
                            </td>
                            <td
                              v-for="field in tableBuilderFields"
                              :key="field.id + '-field'"
                              class="border-r border-gray-200 p-0"
                            >
                              <select
                                v-model="field.column"
                                class="w-full border-none bg-transparent px-1 py-1 text-[11px] focus:ring-0"
                              >
                                <option
                                  v-for="col in resolveTableColumns(
                                    field.table
                                  )"
                                  :key="col"
                                  :value="col"
                                >
                                  {{ col }}
                                </option>
                              </select>
                            </td>
                            <td></td>
                          </tr>
                          <!-- Table row -->
                          <tr class="border-b border-gray-200">
                            <td
                              class="border-r border-gray-300 bg-gray-50 px-2 py-1 font-medium text-gray-700"
                            >
                              {{
                                t(
                                  'admin.achievements.tableBuilder.fields.table'
                                )
                              }}
                            </td>
                            <td
                              v-for="field in tableBuilderFields"
                              :key="field.id + '-table'"
                              class="border-r border-gray-200 p-0"
                            >
                              <select
                                v-model="field.table"
                                class="w-full border-none bg-transparent px-1 py-1 text-[11px] focus:ring-0"
                                @change="handleFieldTableChange(field)"
                              >
                                <option
                                  v-for="table in tableBuilderSelectedTableDetails"
                                  :key="table.name"
                                  :value="table.name"
                                >
                                  {{ table.label }}
                                </option>
                              </select>
                            </td>
                            <td></td>
                          </tr>
                          <!-- Aggregation row -->
                          <tr class="border-b border-gray-200">
                            <td
                              class="border-r border-gray-300 bg-gray-50 px-2 py-1 font-medium text-gray-700"
                            >
                              {{
                                t(
                                  'admin.achievements.tableBuilder.fields.aggregation'
                                )
                              }}
                            </td>
                            <td
                              v-for="field in tableBuilderFields"
                              :key="field.id + '-agg'"
                              class="border-r border-gray-200 p-0"
                            >
                              <select
                                v-model="field.aggregation"
                                class="w-full border-none bg-transparent px-1 py-1 text-[11px] focus:ring-0"
                              >
                                <option
                                  v-for="[label, value] in aggregatorOptions"
                                  :key="value"
                                  :value="value"
                                >
                                  {{ label }}
                                </option>
                              </select>
                            </td>
                            <td></td>
                          </tr>
                          <!-- Alias row -->
                          <tr class="border-b border-gray-200">
                            <td
                              class="border-r border-gray-300 bg-gray-50 px-2 py-1 font-medium text-gray-700"
                            >
                              {{
                                t(
                                  'admin.achievements.tableBuilder.fields.alias'
                                )
                              }}
                            </td>
                            <td
                              v-for="field in tableBuilderFields"
                              :key="field.id + '-alias'"
                              class="border-r border-gray-200 p-0"
                            >
                              <input
                                v-model="field.alias"
                                type="text"
                                class="w-full border-none bg-transparent px-1 py-1 text-[11px] focus:ring-0"
                                :placeholder="
                                  t(
                                    'admin.achievements.tableBuilder.fields.aliasPlaceholder'
                                  )
                                "
                              />
                            </td>
                            <td></td>
                          </tr>
                          <!-- Sort row -->
                          <tr class="border-b border-gray-200">
                            <td
                              class="border-r border-gray-300 bg-gray-50 px-2 py-1 font-medium text-gray-700"
                            >
                              {{
                                t('admin.achievements.tableBuilder.fields.sort')
                              }}
                            </td>
                            <td
                              v-for="field in tableBuilderFields"
                              :key="field.id + '-sort'"
                              class="border-r border-gray-200 p-0"
                            >
                              <select
                                v-model="field.sort"
                                class="w-full border-none bg-transparent px-1 py-1 text-[11px] focus:ring-0"
                              >
                                <option
                                  v-for="option in tableBuilderSortOptions"
                                  :key="option.value || 'none'"
                                  :value="option.value"
                                >
                                  {{ t(option.labelKey) }}
                                </option>
                              </select>
                            </td>
                            <td></td>
                          </tr>
                          <!-- Show row -->
                          <tr class="border-b border-gray-200">
                            <td
                              class="border-r border-gray-300 bg-gray-50 px-2 py-1 font-medium text-gray-700"
                            >
                              {{
                                t('admin.achievements.tableBuilder.fields.show')
                              }}
                            </td>
                            <td
                              v-for="field in tableBuilderFields"
                              :key="field.id + '-show'"
                              class="border-r border-gray-200 p-0 text-center"
                            >
                              <input
                                v-model="field.output"
                                type="checkbox"
                                class="h-3 w-3"
                              />
                            </td>
                            <td></td>
                          </tr>
                          <!-- Criteria rows (multiple AND conditions) -->
                          <tr
                            v-for="(_, criteriaIdx) in maxCriteriaRows"
                            :key="'criteria-' + criteriaIdx"
                            class="border-b border-gray-200"
                          >
                            <td
                              class="border-r border-gray-300 bg-gray-50 px-2 py-1 font-medium text-gray-700"
                            >
                              <div class="flex items-center gap-1">
                                <span v-if="criteriaIdx === 0">
                                  {{
                                    t(
                                      'admin.achievements.tableBuilder.fields.criteria'
                                    )
                                  }}
                                </span>
                                <span
                                  v-else
                                  class="text-gray-400"
                                  >AND</span
                                >
                                <button
                                  v-if="criteriaIdx === maxCriteriaRows - 1"
                                  type="button"
                                  class="ml-auto text-[10px] text-blue-600 hover:text-blue-800"
                                  @click="addCriteriaRow"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td
                              v-for="field in tableBuilderFields"
                              :key="field.id + '-criteria-' + criteriaIdx"
                              class="border-r border-gray-200 p-0"
                            >
                              <input
                                :value="field.criteria[criteriaIdx] ?? ''"
                                type="text"
                                class="w-full border-none bg-transparent px-1 py-1 text-[11px] focus:ring-0"
                                :placeholder="
                                  t(
                                    'admin.achievements.tableBuilder.fields.criteriaPlaceholder'
                                  )
                                "
                                @input="
                                  updateFieldCriteria(
                                    field,
                                    criteriaIdx,
                                    ($event.target as HTMLInputElement).value
                                  )
                                "
                              />
                            </td>
                            <td></td>
                          </tr>
                          <!-- Or rows (multiple OR conditions) -->
                          <tr
                            v-for="(_, orIdx) in maxOrCriteriaRows"
                            :key="'or-' + orIdx"
                            class="border-b border-gray-200"
                          >
                            <td
                              class="border-r border-gray-300 bg-gray-50 px-2 py-1 font-medium text-gray-700"
                            >
                              <div class="flex items-center gap-1">
                                <span v-if="orIdx === 0">
                                  {{
                                    t(
                                      'admin.achievements.tableBuilder.fields.or'
                                    )
                                  }}
                                </span>
                                <span
                                  v-else
                                  class="text-gray-400"
                                  >OR</span
                                >
                                <button
                                  v-if="orIdx === maxOrCriteriaRows - 1"
                                  type="button"
                                  class="ml-auto text-[10px] text-blue-600 hover:text-blue-800"
                                  @click="addOrCriteriaRow"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td
                              v-for="field in tableBuilderFields"
                              :key="field.id + '-or-' + orIdx"
                              class="border-r border-gray-200 p-0"
                            >
                              <input
                                :value="field.orCriteria[orIdx] ?? ''"
                                type="text"
                                class="w-full border-none bg-transparent px-1 py-1 text-[11px] focus:ring-0"
                                :placeholder="
                                  t(
                                    'admin.achievements.tableBuilder.fields.orPlaceholder'
                                  )
                                "
                                @input="
                                  updateFieldOrCriteria(
                                    field,
                                    orIdx,
                                    ($event.target as HTMLInputElement).value
                                  )
                                "
                              />
                            </td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <!-- SQL Preview Bar -->
                    <div
                      class="border-t border-gray-400 bg-gradient-to-b from-[#f0f0f0] to-[#e0e0e0] p-2"
                    >
                      <div class="flex items-center justify-between gap-2">
                        <span class="text-xs font-bold text-gray-700">SQL</span>
                        <button
                          type="button"
                          class="rounded border border-gray-400 bg-gradient-to-b from-white to-gray-100 px-3 py-1 text-xs font-medium shadow-sm hover:from-gray-50 hover:to-gray-200 disabled:opacity-50"
                          :disabled="!hasTableBuilderPreview"
                          @click="applyTableBuilderSqlToEditor"
                        >
                          {{
                            t('admin.achievements.tableBuilder.preview.apply')
                          }}
                        </button>
                      </div>
                      <pre
                        v-if="tableBuilderSqlPreview"
                        class="mt-2 max-h-24 overflow-auto rounded border border-gray-300 bg-white p-2 font-mono text-[11px] text-gray-800"
                      ><code>{{ tableBuilderSqlPreview }}</code></pre>
                      <p
                        v-else
                        class="mt-2 text-xs text-gray-500"
                      >
                        {{ t('admin.achievements.tableBuilder.previewEmpty') }}
                      </p>
                      <div class="mt-1 text-xs">
                        <p
                          v-if="tableBuilderMessage"
                          class="text-emerald-600"
                        >
                          {{ tableBuilderMessage }}
                        </p>
                        <p
                          v-if="tableBuilderError"
                          class="text-red-600"
                        >
                          {{ tableBuilderError }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
                @click="generateSQL"
              >
                {{ t('admin.achievements.actions.generate') }}
              </button>
              <button
                type="button"
                class="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                @click="generateAndExportSQL"
              >
                {{ t('admin.achievements.actions.export') }}
              </button>
              <button
                type="button"
                class="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                @click="saveWorkspace"
              >
                {{ t('admin.achievements.actions.save') }}
              </button>
              <button
                type="button"
                class="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
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
