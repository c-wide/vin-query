import Handsontable from "handsontable/base";
import { DecodeVinValuesResponse } from "../types/DecodeVinValues";
import { clearRows } from "../CustomTable";

export type FetchRequest =
  | {
      status: "IN_QUEUE";
      vin: string;
      year?: string;
    }
  | {
      status: "IN_PROCESS";
      vin: string;
      year?: string;
      controller: AbortController;
    };

export class FetchHandler {
  private instance: Handsontable | null = null;
  private pendingRequests = new Map<number, FetchRequest>();
  private throttleDelay: number;
  private throttleInProgress: boolean = false;

  constructor(throttleDelay: number) {
    this.throttleDelay = throttleDelay;
  }

  private async throttleFetch() {
    if (this.throttleInProgress) {
      return;
    }

    this.throttleInProgress = true;

    while (this.pendingRequests.size > 0) {
      const [row, request] =
        [...this.pendingRequests.entries()].find(
          ([, req]) => req.status === "IN_QUEUE"
        ) ?? [];

      if (row !== undefined && request !== undefined) {
        const controller = new AbortController();
        const updatedRequest: FetchRequest = {
          ...request,
          status: "IN_PROCESS",
          controller,
        };
        this.pendingRequests.set(row, updatedRequest);

        try {
          const response = await this.fetchData(
            request.vin,
            request.year,
            controller.signal
          );
          if (this.instance) {
            this.instance.setDataAtCell(row, 2, response.manufacturer || "N/A");
            this.instance.setDataAtCell(row, 3, response.make || "N/A");
            this.instance.setDataAtCell(row, 4, response.model || "N/A");
            this.instance.setDataAtCell(row, 5, response.vehicleType || "N/A");
            this.instance.setDataAtCell(row, 6, response.bodyClass || "N/A");
            this.instance.setDataAtCell(row, 7, response.gvwr || "N/A");
          }
        } catch (error) {
          if (error instanceof Error && error.name !== "AbortError") {
            console.error("Fetch error:", error);
          }
        } finally {
          this.pendingRequests.delete(row);
        }

        await new Promise((resolve) => setTimeout(resolve, this.throttleDelay));
      } else {
        break;
      }
    }

    this.throttleInProgress = false;
  }

  private async fetchData(
    vin: string,
    year?: string,
    signal?: AbortSignal
  ): Promise<{
    gvwr: string;
    manufacturer: string;
    make: string;
    model: string;
    vehicleType: string;
    bodyClass: string;
  }> {
    const url = new URL(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}`
    );
    url.searchParams.set("format", "json");
    if (year) {
      url.searchParams.set("modelyear", year);
    }

    const response = await fetch(url.toString(), { signal });

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    const data = (await response.json()) as DecodeVinValuesResponse;
    const { GVWR, Manufacturer, Make, Model, VehicleType, BodyClass } =
      data.Results[0];

    return {
      gvwr: GVWR,
      manufacturer: Manufacturer,
      make: Make,
      model: Model,
      vehicleType: VehicleType,
      bodyClass: BodyClass,
    };
  }

  setInstance(instance: Handsontable | null | undefined) {
    if (!instance) return;
    this.instance = instance;
  }

  addRequest(row: number, vin: string, year?: string) {
    if (this.pendingRequests.has(row)) {
      throw new Error(`Attempted to overwrite pending request on row ${row}`);
    }

    this.pendingRequests.set(row, { status: "IN_QUEUE", vin, year });

    clearRows(this.instance, row);

    this.throttleFetch();
  }

  updateRequest(
    row: number,
    target: "vin" | "year",
    action: "changed" | "deleted",
    value?: string
  ) {
    const pendingReq = this.pendingRequests.get(row);

    if (!pendingReq) {
      throw new Error(
        "Attempted to updated a pending request that doesn't exist."
      );
    }

    if (target === "vin" && action === "deleted") {
      if (pendingReq.status === "IN_PROCESS") {
        pendingReq.controller.abort();
      }

      clearRows(this.instance, row);

      this.pendingRequests.delete(row);

      return;
    }

    if (pendingReq.status === "IN_PROCESS") {
      pendingReq.controller.abort();

      setTimeout(() => {
        const newReq: Omit<FetchRequest, "status"> = {
          vin: target === "vin" ? value ?? "" : pendingReq.vin,
          year: target === "year" ? value : pendingReq.year,
        };

        this.pendingRequests.delete(row);

        this.addRequest(row, newReq.vin, newReq.year);
      }, 0);
    } else {
      pendingReq[target] = value ?? "";
    }
  }

  hasRequest(row: number) {
    return this.pendingRequests.has(row);
  }
}
