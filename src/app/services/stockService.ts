import { supabase } from "../lib/supabase";
import { FilmStockItem } from "../types";

function mapDbToFilmStock(row: any): FilmStockItem {
  return {
    id: row.id,
    type: row.type,
    availableMeters: Number(row.available_meters),
    rollWidthCm: Number(row.roll_width_cm),
    minThresholdMeters: Number(row.min_threshold_meters),
    lastRestocked: row.last_restocked,
    pressName: row.press_name || undefined,
    perCoverPriceBdt: row.per_cover_price_bdt != null ? Number(row.per_cover_price_bdt) : undefined,
  };
}

export const stockService = {
  /**
   * Fetch all film stock items from Supabase
   */
  async fetchFilmStock(): Promise<FilmStockItem[]> {
    const { data, error } = await supabase
      .from("film_stock")
      .select("*")
      .order("type", { ascending: true });

    if (error) {
      console.error("Error fetching film stock from Supabase:", error);
      throw error;
    }

    return (data || []).map(mapDbToFilmStock);
  },

  /**
   * Deduct meters from a specific press's stock upon accepting a new order.
   * Uses the atomic deduct_film_stock RPC so concurrent orders can never
   * double-spend the same meters.
   */
  async deductStock(pressName: string, type: string, metersToDeduct: number): Promise<void> {
    const { error } = await supabase.rpc("deduct_film_stock", {
      p_press_name: pressName,
      p_type: type,
      p_meters: metersToDeduct,
    });

    if (error) {
      console.error("Error deducting film stock:", error);
      throw error;
    }
  },

  /**
   * Restock meters for a film type, optionally updating its per-cover price
   */
  async restockItem(
    id: string,
    additionalMeters: number,
    perCoverPriceBdt?: number
  ): Promise<void> {
    const { data: stockItem, error: fetchError } = await supabase
      .from("film_stock")
      .select("available_meters")
      .eq("id", id)
      .single();

    if (fetchError || !stockItem) throw fetchError;

    const updatedMeters = Number(stockItem.available_meters) + additionalMeters;
    const today = new Date().toISOString().split("T")[0];
    const updates: Record<string, unknown> = {
      available_meters: updatedMeters,
      last_restocked: today,
    };
    if (perCoverPriceBdt != null) {
      updates.per_cover_price_bdt = perCoverPriceBdt;
    }

    const { error: updateError } = await supabase
      .from("film_stock")
      .update(updates)
      .eq("id", id);

    if (updateError) throw updateError;
  },

  /**
   * Register a brand-new roll type owned by a specific press (with 0 or a
   * starting meter count) so each press's inventory stays distinct.
   */
  async addNewRollType(params: {
    pressName: string;
    type: string;
    rollWidthCm: number;
    minThresholdMeters: number;
    perCoverPriceBdt: number;
    initialMeters: number;
  }): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("film_stock").insert([
      {
        id: `stk-${Date.now()}`,
        press_name: params.pressName,
        type: params.type,
        available_meters: params.initialMeters,
        roll_width_cm: params.rollWidthCm,
        min_threshold_meters: params.minThresholdMeters,
        per_cover_price_bdt: params.perCoverPriceBdt,
        last_restocked: today,
      },
    ]);

    if (error) throw error;
  },
};
