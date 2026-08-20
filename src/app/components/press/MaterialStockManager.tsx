import React, { useState } from "react";
import { FilmStockItem, JobOrder } from "../../types";
import {
  Layers,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Package,
  RotateCcw,
  PlusCircle,
  X,
} from "lucide-react";

interface MaterialStockManagerProps {
  stock: FilmStockItem[];
  jobs: JobOrder[];
  onAddStock: (type: string, meters: number) => void;
}

export const MaterialStockManager: React.FC<MaterialStockManagerProps> = ({
  stock,
  jobs,
  onAddStock,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedType, setSelectedType] = useState(stock[0]?.type || "Matte 30μm");
  const [addMeters, setAddMeters] = useState(1000);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddStock(selectedType, Number(addMeters));
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
            Material Coverage &amp; Film Stock Calculator
          </h3>
          <p className="text-xs text-blue-800 max-w-xl mt-0.5">
            Checks on-hand lamination film rolls before orders are accepted, preventing mid-job material shortages on the shop floor.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="py-2.5 px-4 bg-blue-700 text-white font-extrabold text-xs rounded-xl hover:bg-blue-800 transition-colors shadow-md flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          Restock / Add Film Rolls
        </button>
      </div>

      {/* PC Grid of Stock Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stock.map((item) => {
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
                    {item.availableMeters.toLocaleString()} <span className="text-xs font-normal text-gray-500">meters</span>
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">Width: {item.rollWidthCm}cm</span>
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

      {/* Restock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-blue-100 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-700" />
                <h3 className="font-extrabold text-gray-900 text-base">Record New Film Roll Supply</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">Film Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {stock.map((s) => (
                    <option key={s.id} value={s.type}>
                      {s.type} (Width: {s.rollWidthCm}cm)
                    </option>
                  ))}
                </select>
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
                Update Film Inventory
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
