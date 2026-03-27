import { useCallback, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  type ColDef,
  type GridReadyEvent,
  type GridApi,
  type ICellRendererParams,
  ModuleRegistry,
  ClientSideRowModelModule,
  TextEditorModule,
  TextFilterModule,
  CheckboxEditorModule,
  ValidationModule,
  CellStyleModule,
  RowSelectionModule,
} from "ag-grid-community";
import { type EntryIn, bulkSaveEntries } from "@/api/partnerEntries";

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  TextEditorModule,
  TextFilterModule,
  CheckboxEditorModule,
  ValidationModule,
  CellStyleModule,
  RowSelectionModule,
]);

interface RowData {
  _rowId: string;
  project_name: string;
  project_pm: string;
  module: string;
  role: string;
  contract_company: string;
  belong_company: string;
  team: string;
  name: string;
  email: string;
  start_date: string;
  end_date: string;
  req_pledge: boolean;
  req_ad: boolean;
  req_srbs: boolean;
}

function createEmptyRow(): RowData {
  return {
    _rowId: Math.random().toString(36).slice(2) + Date.now().toString(36),
    project_name: "",
    project_pm: "",
    module: "",
    role: "",
    contract_company: "",
    belong_company: "",
    team: "",
    name: "",
    email: "",
    start_date: "",
    end_date: "",
    req_pledge: false,
    req_ad: false,
    req_srbs: false,
  };
}

const INPUT_FIELDS = [
  "project_name",
  "project_pm",
  "module",
  "role",
  "contract_company",
  "belong_company",
  "team",
  "name",
  "email",
  "start_date",
  "end_date",
] as const;

function DeleteBtnRenderer(props: ICellRendererParams<RowData>) {
  return (
    <span
      className="material-icons-outlined"
      style={{ fontSize: 16, color: "var(--color-text-muted)", cursor: "pointer" }}
      onClick={() => {
        const rowId = props.data?._rowId;
        if (rowId && props.context?.onDeleteRow) {
          props.context.onDeleteRow(rowId);
        }
      }}
    >
      close
    </span>
  );
}

export default function NewEntry() {
  const [rowData, setRowData] = useState<RowData[]>([createEmptyRow()]);
  const gridRef = useRef<AgGridReact>(null);
  const gridApiRef = useRef<GridApi | null>(null);

  const onDeleteRow = useCallback((rowId: string) => {
    setRowData((prev) => {
      const next = prev.filter((r) => r._rowId !== rowId);
      return next.length === 0 ? [createEmptyRow()] : next;
    });
  }, []);

  const columnDefs: ColDef<RowData>[] = [
    {
      headerName: "No",
      valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
      width: 55,
      editable: false,
      pinned: "left",
      cellStyle: {
        textAlign: "center",
        color: "var(--color-text-muted)",
        backgroundColor: "var(--color-bg)",
      },
    },
    { headerName: "과제명", field: "project_name", width: 150 },
    { headerName: "과제PM", field: "project_pm", width: 100 },
    { headerName: "모듈", field: "module", width: 100 },
    { headerName: "역할", field: "role", width: 100 },
    { headerName: "계약 회사명", field: "contract_company", width: 130 },
    { headerName: "소속 회사명", field: "belong_company", width: 130 },
    { headerName: "팀", field: "team", width: 100 },
    { headerName: "성명", field: "name", width: 90 },
    { headerName: "E-mail", field: "email", width: 170 },
    { headerName: "투입일", field: "start_date", width: 110 },
    { headerName: "종료일", field: "end_date", width: 110 },
    {
      headerName: "서약서",
      field: "req_pledge",
      width: 75,
      cellDataType: "boolean",
      editable: true,
    },
    {
      headerName: "AD",
      field: "req_ad",
      width: 60,
      cellDataType: "boolean",
      editable: true,
    },
    {
      headerName: "S-RBS",
      field: "req_srbs",
      width: 75,
      cellDataType: "boolean",
      editable: true,
    },
    {
      headerName: "",
      width: 50,
      editable: false,
      sortable: false,
      filter: false,
      cellRenderer: DeleteBtnRenderer,
      pinned: "right",
    },
  ];

  const defaultColDef: ColDef = {
    editable: true,
    sortable: false,
    resizable: true,
    cellStyle: { fontSize: "13px" },
  };

  const onGridReady = useCallback((params: GridReadyEvent) => {
    gridApiRef.current = params.api;
  }, []);

  // Handle paste from Excel
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData("text/plain");
      if (!text) return;

      const api = gridApiRef.current;
      if (!api) return;

      const focusedCell = api.getFocusedCell();
      if (!focusedCell) return;

      // Check if we're in edit mode — if so, let AG Grid handle it
      if (api.getEditingCells().length > 0) return;

      e.preventDefault();

      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length === 0) return;

      const parsedRows = lines.map((line) => line.split("\t"));

      const startRowIdx = focusedCell.rowIndex;
      const startColId = focusedCell.column.getColId();
      const startColIdx = INPUT_FIELDS.indexOf(
        startColId as (typeof INPUT_FIELDS)[number]
      );

      setRowData((prev) => {
        const next = [...prev];

        // Ensure enough rows
        while (next.length < startRowIdx + parsedRows.length) {
          next.push(createEmptyRow());
        }

        for (let r = 0; r < parsedRows.length; r++) {
          const rowIdx = startRowIdx + r;
          const cells = parsedRows[r];
          for (let c = 0; c < cells.length; c++) {
            const colIdx =
              startColIdx >= 0 ? startColIdx + c : c;
            if (colIdx < INPUT_FIELDS.length) {
              const field = INPUT_FIELDS[colIdx];
              (next[rowIdx] as Record<string, unknown>)[field] =
                cells[c]?.trim() ?? "";
            }
          }
        }

        return next;
      });
    },
    []
  );

  const addRow = () => {
    setRowData((prev) => [...prev, createEmptyRow()]);
  };

  const selectAll = () => {
    gridApiRef.current?.selectAll();
  };

  const clearAll = () => {
    setRowData([createEmptyRow()]);
  };

  const handleSave = async () => {
    const hasData = rowData.some((r) =>
      INPUT_FIELDS.some((f) => (r[f] as string)?.trim())
    );
    if (!hasData) {
      alert("입력된 데이터가 없습니다.");
      return;
    }

    if (!confirm("신청 하시겠습니까?")) return;

    const entries: EntryIn[] = rowData
      .filter((r) => INPUT_FIELDS.some((f) => (r[f] as string)?.trim()))
      .map((r) => ({
        project_name: r.project_name || null,
        project_pm: r.project_pm || null,
        module: r.module || null,
        role: r.role || null,
        contract_company: r.contract_company || null,
        belong_company: r.belong_company || null,
        team: r.team || null,
        name: r.name || null,
        email: r.email || null,
        start_date: r.start_date || null,
        end_date: r.end_date || null,
        req_pledge: r.req_pledge,
        req_ad: r.req_ad,
        req_srbs: r.req_srbs,
      }));

    try {
      const result = await bulkSaveEntries(entries);
      alert(`${result.count}건이 저장되었습니다.`);
      setRowData([createEmptyRow()]);
    } catch {
      alert("저장에 실패했습니다.");
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div
        style={{
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid var(--color-border-light)",
          background: "var(--color-surface)",
        }}
      >
        <button onClick={addRow} style={toolbarBtnStyle}>
          <span className="material-icons-outlined" style={{ fontSize: 16 }}>
            add
          </span>
          행 추가
        </button>
        <button onClick={selectAll} style={toolbarBtnStyle}>
          <span className="material-icons-outlined" style={{ fontSize: 16 }}>
            select_all
          </span>
          전체 선택
        </button>
        <button onClick={clearAll} style={{ ...toolbarBtnStyle, color: "#e74c3c" }}>
          <span className="material-icons-outlined" style={{ fontSize: 16 }}>
            delete_outline
          </span>
          전체 삭제
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
          Excel에서 복사 후 Grid에 붙여넣기 가능
        </span>
      </div>

      {/* Grid */}
      <div
        style={{ flex: 1, overflow: "hidden" }}
        onPaste={handlePaste}
      >
        <AgGridReact
          ref={gridRef}
          theme="legacy"
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          getRowId={(params) => params.data._rowId}
          onGridReady={onGridReady}
          context={{ onDeleteRow }}
          rowSelection={{ mode: "multiRow", enableClickSelection: false }}
          stopEditingWhenCellsLoseFocus={true}
          enterNavigatesVertically={true}
          enterNavigatesVerticallyAfterEdit={true}
        />
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button onClick={handleSave} style={saveBtnStyle}>
          저장
        </button>
      </div>
    </div>
  );
}

const toolbarBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "5px 12px",
  fontSize: 12,
  fontWeight: 500,
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  background: "var(--color-surface)",
  color: "var(--color-text-secondary)",
  cursor: "pointer",
};

const saveBtnStyle: React.CSSProperties = {
  padding: "8px 32px",
  fontSize: 14,
  fontWeight: 600,
  border: "none",
  borderRadius: "var(--radius-md)",
  background: "var(--color-primary)",
  color: "#fff",
  cursor: "pointer",
};
