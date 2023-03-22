import { useRef, memo, useEffect } from "react";
import Handsontable from "handsontable/base";
import { registerAllModules } from "handsontable/registry";
import { HotTable } from "@handsontable/react";
import { debounce } from "./utils/debounce";
import { FetchHandler } from "./utils/fetchHandler";

import "handsontable/dist/handsontable.full.min.css";

registerAllModules();

const columns = [
  { data: 0, type: "text" },
  {
    data: 1,
    type: "numeric",
    validator: function (
      value: number | null,
      callback: (valid: boolean) => void
    ) {
      if (value === null || value.toString() === "" || value >= 1900) {
        callback(true);
      } else {
        callback(false);
      }
    },
    allowInvalid: false,
  },
  { data: 2, type: "text", readOnly: true },
  { data: 3, type: "text", readOnly: true },
  { data: 4, type: "text", readOnly: true },
  { data: 5, type: "text", readOnly: true },
  { data: 6, type: "text", readOnly: true },
  { data: 7, type: "text", readOnly: true },
];

export function clearRows(
  hotInstance: Handsontable | null | undefined,
  row: number
) {
  if (!hotInstance) return;

  for (let i = 2; i < columns.length; i++) {
    hotInstance.setDataAtCell(row, i, null);
  }
}

const removeEmptyRowsFromEnd = (hotInstance: Handsontable) => {
  const rowCount = hotInstance.countRows();
  let lastNonEmptyRow = -1;

  for (let row = 0; row < rowCount; row++) {
    const vin = hotInstance.getDataAtCell(row, 0);
    const year = hotInstance.getDataAtCell(row, 1);

    if ((vin === null || vin === "") && (year === null || year === "")) {
      if (lastNonEmptyRow === -1) {
        lastNonEmptyRow = row - 1;
      }
    } else {
      lastNonEmptyRow = -1;
    }
  }

  if (lastNonEmptyRow !== -1 && rowCount - lastNonEmptyRow > 1) {
    hotInstance.alter(
      "remove_row",
      lastNonEmptyRow + 1,
      rowCount - lastNonEmptyRow - 1
    );
  }
};

const saveData = debounce((hotInstance: Handsontable) => {
  localStorage.setItem("vq_table", JSON.stringify(hotInstance.getData()));
}, 1000);

const fetchHandler = new FetchHandler(100);

function CustomTable() {
  const hotTableRef = useRef<HotTable | null>(null);

  useEffect(() => {
    fetchHandler.setInstance(hotTableRef.current?.hotInstance);
  }, [hotTableRef]);

  const handleAfterChange = (
    changes: Handsontable.CellChange[] | null,
    source: string | Handsontable.ChangeSource
  ) => {
    const hotInstance = hotTableRef.current?.hotInstance;
    if (!hotInstance) return;

    if (source === "loadData") {
      return;
    }

    changes?.forEach(([row, column, oldValue, newValue]) => {
      if (column === 0 || column === 1) {
        if (oldValue === newValue) return;

        const isDeleted = newValue === null || newValue === "";

        if (fetchHandler.hasRequest(row)) {
          fetchHandler.updateRequest(
            row,
            column === 0 ? "vin" : "year",
            isDeleted ? "deleted" : "changed",
            typeof newValue === "number" ? newValue.toString() : newValue
          );
        } else if (
          (column === 0 && !isDeleted) ||
          (column === 1 && hotInstance.getDataAtCell(row, 0))
        ) {
          const vin =
            column === 0 ? newValue : hotInstance.getDataAtCell(row, 0);
          const year =
            column === 1 ? newValue : hotInstance.getDataAtCell(row, 1);

          fetchHandler.addRequest(
            row,
            vin,
            typeof year === "number" ? year.toString() : year
          );
        }

        if (column === 0 && isDeleted) {
          clearRows(hotInstance, row);
        }
      }
    });

    removeEmptyRowsFromEnd(hotInstance);
    saveData(hotInstance);
  };

  const data = localStorage.getItem("vq_table");

  return (
    <HotTable
      ref={hotTableRef}
      data={data ? JSON.parse(data) : [[]]}
      colHeaders={[
        "VIN",
        "Year",
        "Manufacturer",
        "Make",
        "Model",
        "Type",
        "Class",
        "GVWR",
      ]}
      columns={columns}
      maxCols={8}
      minSpareRows={1}
      rowHeaders={true}
      manualColumnResize={false}
      manualRowResize={false}
      stretchH="all"
      preventOverflow="horizontal"
      afterChange={handleAfterChange}
      licenseKey="non-commercial-and-evaluation"
    />
  );
}

export default memo(CustomTable);
