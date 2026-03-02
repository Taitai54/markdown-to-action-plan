"use client";

import { useState } from "react";

interface ActionPlanCardProps {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: string;
}

const PRIORITY_STYLES = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

export default function ActionPlanCard({
  title,
  description,
  priority,
  category,
}: ActionPlanCardProps) {
  const [done, setDone] = useState(false);

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        done ? "bg-gray-50 opacity-60" : "bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={done}
          onChange={() => setDone(!done)}
          className="mt-1 h-4 w-4 rounded border-gray-300 accent-blue-600"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3
              className={`font-medium ${
                done ? "line-through text-gray-400" : "text-gray-900"
              }`}
            >
              {title}
            </h3>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_STYLES[priority]}`}
            >
              {priority}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {category}
            </span>
          </div>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  );
}
