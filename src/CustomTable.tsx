import { useRef, memo, useEffect } from "react";
import Handsontable from "handsontable/base";
import { registerAllModules } from "handsontable/registry";
import { HotTable } from "@handsontable/react";
import { debounce } from "./utils/debounce";
import { FetchHandler } from "./utils/fetchHandler";
import { textRenderer } from "handsontable/renderers/textRenderer";
import Core from "handsontable/core";
import { CellProperties } from "handsontable/settings";

import "handsontable/dist/handsontable.full.min.css";

registerAllModules();

const linkRenderer = (
  _1: Core,
  td: HTMLTableCellElement,
  _2: number,
  _3: number,
  _4: string | number,
  value: unknown,
  _5: CellProperties
) => {
  const escaped = `${value}`;

  if (escaped.indexOf("https") === 0) {
    const a = document.createElement("a");

    a.href = escaped;
    a.target = "_blank";
    a.innerHTML = "View Image";

    const preview = document.createElement("img");
    preview.src = escaped;
    preview.classList.add("image-preview");

    a.addEventListener("mouseover", (e) => {
      const event = e as MouseEvent;
      const xOffset = 20;
      const yOffset = 20;
      preview.style.display = "block";
      preview.style.opacity = "0"; // Set to invisible initially
      const imgWidth = preview.offsetWidth;
      const imgHeight = preview.offsetHeight;
      const pageWidth = window.innerWidth;
      const pageHeight = window.innerHeight;

      let left = event.pageX + xOffset;
      let top = event.pageY + yOffset;

      // Adjust the position if the image goes off the edge of the page
      if (left + imgWidth > pageWidth) {
        left = pageWidth - imgWidth - xOffset;
      }
      if (top + imgHeight > pageHeight) {
        top = pageHeight - imgHeight - yOffset;
      }

      preview.style.left = `${left}px`;
      preview.style.top = `${top}px`;
      preview.style.opacity = "1"; // Make it visible after positioning
    });

    a.addEventListener("mouseout", () => {
      preview.style.display = "none";
    });

    td.innerText = "";
    td.className = "htCenter htMiddle";

    td.appendChild(a);
    document.body.appendChild(preview);
  } else {
    textRenderer.apply(this, [_1, td, _2, _3, _4, value, _5]);
  }

  return td;
};

const columns = [
  { data: 0, type: "text", className: "htCenter htMiddle" },
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
    className: "htCenter htMiddle",
  },
  { data: 2, type: "text", readOnly: true, className: "htCenter htMiddle" },
  { data: 3, type: "text", readOnly: true, className: "htCenter htMiddle" },
  { data: 4, type: "text", readOnly: true, className: "htCenter htMiddle" },
  { data: 5, type: "text", readOnly: true, className: "htCenter htMiddle" },
  { data: 6, type: "text", readOnly: true, className: "htCenter htMiddle" },
  { data: 7, type: "text", readOnly: true, className: "htCenter htMiddle" },
  {
    data: 8,
    type: "text",
    readOnly: true,
    className: "htCenter htMiddle",
    renderer: linkRenderer,
  },
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
        "Image",
      ]}
      columns={columns}
      maxCols={9}
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
