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
   * Deduct meters from stock upon accepting a new order
   */
  async deductStock(type: string, metersToDeduct: number): Promise<void> {
    const { data: stockItem, error: fetchError } = await supabase
      .from("film_stock")
      .select("id, available_meters")
      .eq("type", type)
      .single();

    if (fetchError || !stockItem) return;

    const newMeters = Math.max(0, Number(stockItem.available_meters) - metersToDeduct);

    const { error: updateError } = await supabase
      .from("film_stock")
      .update({ available_meters: newMeters })
      .eq("id", stockItem.id);

    if (updateError) {
      console.error("Error updating film stock:", updateError);
      throw updateError;
    }
  },

  /**
   * Restock meters for a film type
   */
  async restockItem(id: string, additionalMeters: number): Promise<void> {
    const { data: stockItem, error: fetchError } = await supabase
      .from("film_stock")
      .select("available_meters")
      .eq("id", id)
      .single();

    if (fetchError || !stockItem) throw fetchError;

    const updatedMeters = Number(stockItem.available_meters) + additionalMeters;
    const today = new Date().toISOString().split("T")[0];

    const { error: updateError } = await supabase
      .from("film_stock")
      .update({
        available_meters: updatedMeters,
        last_restocked: today,
      })
      .eq("id", id);

    if (updateError) throw updateError;
  },
};
