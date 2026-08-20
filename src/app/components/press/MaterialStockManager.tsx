import React, { useState } from "react";
import { FilmStockItem, JobOrder } from "../../types";
import {
  Layers,
  AlertTriangle,
  CheckCircle2,
  Package,
  PlusCircle,
  X,
} from "lucide-react";

interface MaterialStockManagerProps {
  stock: FilmStockItem[];
  jobs: JobOrder[];
  pressName: string;
  onAddStock: (type: string, meters: number, perCoverPriceBdt?: number) => void;
  onAddNewType: (params: {
    type: string;
    rollWidthCm: number;
    minThresholdMeters: number;
    perCoverPriceBdt: number;
    initialMeters: number;
  }) => void;
}

export const MaterialStockManager: React.FC<MaterialStockManagerProps> = ({
  stock,
  jobs,
  pressName,
  onAddStock,
  onAddNewType,
}) => {
  const myStock = stock.filter((s) => s.pressName === pressName);

  const [showAddModal, setShowAddModal] = useState(false);
  const [isNewType, setIsNewType] = useState(false);
  const [selectedType, setSelectedType] = useState(myStock[0]?.type || "");
  const [addMeters, setAddMeters] = useState(1000);
  const [pricePerCover, setPricePerCover] = useState<number>(myStock[0]?.perCoverPriceBdt ?? 0);
  const [newTypeName, setNewTypeName] = useState("");
  const [newRollWidth, setNewRollWidth] = useState(72);
  const [newThreshold, setNewThreshold] = useState(1000);

  const openModal = (asNew: boolean) => {
    setIsNewType(asNew);
    setSelectedType(myStock[0]?.type || "");
    setPricePerCover(myStock[0]?.perCoverPriceBdt ?? 0);
    setAddMeters(1000);
    setNewTypeName("");
    setNewRollWidth(72);
    setNewThreshold(1000);
    setShowAddModal(true);
  };

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    const match = myStock.find((s) => s.type === type);
    if (match) setPricePerCover(match.perCoverPriceBdt ?? 0);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNewType) {
      onAddNewType({
        type: newTypeName.trim(),
        rollWidthCm: Number(newRollWidth),
        minThresholdMeters: Number(newThreshold),
        perCoverPriceBdt: Number(pricePerCover) || 0,
        initialMeters: Number(addMeters),
      });
    } else {
      onAddStock(selectedType, Number(addMeters), Number(pricePerCover) || undefined);
    }
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-widest">
              INVENTORY GUARD
            </span>
          </div>
          <h3 className="text-lg font-extrabold text-blue-950 mt-1">
            {pressName} Material Coverage &amp; Film Stock
          </h3>
          <p className="text-xs text-blue-800 max-w-xl mt-0.5">
            Each press manages its own roll types, prices, and stock levels. Orders check coverage against your inventory before acceptance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openModal(false)}
            className="py-2.5 px-4 bg-blue-700 text-white font-extrabold text-xs rounded-xl hover:bg-blue-800 transition-colors shadow-md flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            Restock Film Rolls
          </button>
          <button
            onClick={() => openModal(true)}
            className="py-2.5 px-4 bg-white border-2 border-blue-700 text-blue-800 font-extrabold text-xs rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            Add New Roll Type
          </button>
        </div>
      </div>

      {/* PC Grid of Stock Items */}
      {myStock.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-blue-300 p-10 text-center">
          <Layers className="w-10 h-10 mx-auto text-blue-300" />
          <p className="font-extrabold text-gray-700 mt-3">No film inventory configured yet</p>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            Add your first lamination roll type with the "Add New Roll Type" button. Until then, publishers cannot place orders against {pressName}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {myStock.map((item) => {
            const isLow = item.availableMeters <= item.minThresholdMeters;
            const pendingOrdersMeter = jobs
              .filter((j) => j.laminationType === item.type && j.status !== "Completed")
              .reduce((sum, j) => sum + (j.estimatedFilmMeters || 0), 0);

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border bg-white shadow-xs space-y-3 transition-all ${
                  isLow ? "border-red-300 ring-1 ring-red-200" : "border-green-100"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Roll Stock Type
                    </span>
                    <h4 className="font-extrabold text-gray-900 text-base">{item.type}</h4>
                  </div>
                  <div
                    className={`p-2 rounded-xl text-xs ${
                      isLow ? "bg-red-100 text-red-700 font-bold" : "bg-emerald-50 text-[#2e7d46]"
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-gray-900">
                      {item.availableMeters.toLocaleString()}{" "}
                      <span className="text-xs font-normal text-gray-500">meters</span>
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">
                      Width: {item.rollWidthCm}cm
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isLow ? "bg-red-500" : "bg-[#2e7d46]"
                      }`}
                      style={{
                        width: `${Math.min(100, (item.availableMeters / (item.minThresholdMeters * 3)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 text-[11px] space-y-1">
                  <div className="flex justify-between text-gray-500">
                    <span>Per-Cover Price:</span>
                    <span className="font-bold text-emerald-800">
                      BDT {item.perCoverPriceBdt ? item.perCoverPriceBdt.toLocaleString() : "—"}/cover
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Reserved for Active Orders:</span>
                    <span className="font-bold text-gray-800">{pendingOrdersMeter.toLocaleString()}m</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Minimum Threshold:</span>
                    <span className="font-bold text-gray-700">{item.minThresholdMeters.toLocaleString()}m</span>
                  </div>
                </div>

                {isLow ? (
                  <div className="p-2 bg-red-50 rounded-lg text-[10px] font-bold text-red-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> LOW STOCK ALERT! Restock needed.
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-50 rounded-lg text-[10px] font-bold text-[#2e7d46] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sufficient coverage for orders.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Restock / Add New Type Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-blue-100 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-700" />
                <h3 className="font-extrabold text-gray-900 text-base">
                  {isNewType ? "Register New Roll Type" : "Record New Film Roll Supply"}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setIsNewType(false)}
                className={`py-1.5 rounded-lg transition-all ${
                  !isNewType ? "bg-white text-blue-800 shadow-xs" : "text-gray-600"
                }`}
              >
                Restock Existing
              </button>
              <button
                type="button"
                onClick={() => setIsNewType(true)}
                className={`py-1.5 rounded-lg transition-all ${
                  isNewType ? "bg-white text-blue-800 shadow-xs" : "text-gray-600"
                }`}
              >
                Add New Type
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {isNewType ? (
                <>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Roll Type / Finish Name</label>
                    <input
                      type="text"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="e.g. Silk Matte 38μm"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-700">Roll Width (cm)</label>
                      <input
                        type="number"
                        value={newRollWidth}
                        onChange={(e) => setNewRollWidth(Number(e.target.value))}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-700">Min Threshold (m)</label>
                      <input
                        type="number"
                        value={newThreshold}
                        onChange={(e) => setNewThreshold(Number(e.target.value))}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Film Type</label>
                  <select
                    value={selectedType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {myStock.map((s) => (
                      <option key={s.id} value={s.type}>
                        {s.type} (Width: {s.rollWidthCm}cm)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">Per-Cover Price (BDT)</label>
                <input
                  type="number"
                  min={0}
                  value={pricePerCover}
                  onChange={(e) => setPricePerCover(Number(e.target.value))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">Meters Received</label>
                <input
                  type="number"
                  value={addMeters}
                  onChange={(e) => setAddMeters(Number(e.target.value))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-700 text-white font-bold text-xs rounded-xl hover:bg-blue-800 transition-colors shadow-md"
              >
                {isNewType ? "Add Roll Type to Inventory" : "Update Film Inventory"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};