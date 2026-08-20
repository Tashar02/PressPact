import { supabase } from "../lib/supabase";
import { CoverTypeItem } from "../types";

function mapDbToCoverType(row: any): CoverTypeItem {
  return {
    id: row.id,
    pressName: row.press_name,
    name: row.name,
    priceBdt: Number(row.price_bdt),
    description: row.description || undefined,
  };
}

export const coverService = {
  /**
   * Fetch every cover type a press can supply, optionally filtered by press.
   */
  async fetchCoverTypes(pressName?: string): Promise<CoverTypeItem[]> {
    let query = supabase.from("cover_types").select("*").order("name", { ascending: true });
    if (pressName) {
      query = query.eq("press_name", pressName);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching cover types from Supabase:", error);
      throw error;
    }

    return (data || []).map(mapDbToCoverType);
  },

  /**
   * Register a new cover type (paper stock) a press is willing to supply.
   */
  async addCoverType(params: {
    pressName: string;
    name: string;
    priceBdt: number;
    description?: string;
  }): Promise<void> {
    const { error } = await supabase.from("cover_types").insert([
      {
        id: `cvr-${Date.now()}`,
        press_name: params.pressName,
        name: params.name,
        price_bdt: params.priceBdt,
        description: params.description || null,
      },
    ]);

    if (error) throw error;
  },

  /**
   * Update the per-cover price of a cover type.
   */
  async updateCoverTypePrice(id: string, priceBdt: number): Promise<void> {
    const { error } = await supabase
      .from("cover_types")
      .update({ price_bdt: priceBdt })
      .eq("id", id);

    if (error) throw error;
  },
};