import Icons from "@/components/icons/icons";
import { useState } from "react";

export default function Pagination({
  totalPages,
  onPageChange,
}: {
  totalPages: number;
  onPageChange?: (page: number) => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    onPageChange?.(page);
  };

  const getVisiblePages = () => {
    let pages: (number | string)[] = [];

    if (totalPages <= 6) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages = [1, 2, 3, "...", totalPages - 1, totalPages];
      } else if (currentPage >= totalPages - 2) {
        pages = [1, 2, "...", totalPages - 2, totalPages - 1, totalPages];
      } else {
        pages = [
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages,
        ];
      }
    }

    return pages.filter(
      (p, i) => pages.indexOf(p) === i || typeof p === "string"
    );
  };

  return (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`text-gray-600 hover:text-black transition ${
          currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <Icons.AngleLeft />
      </button>

      {getVisiblePages().map((page, index) =>
        typeof page === "string" ? (
          <span key={`dots-${index}`} className="px-3 text-lg text-black">
            {page}
          </span>
        ) : (
          <button
            key={`page-${page}`}
            onClick={() => handlePageChange(page)}
            className={`w-10 h-10 rounded-sm text-lg font-medium transition ${
              currentPage === page
                ? "bg-black text-white"
                : "bg-[#f9f9f9] text-black hover:bg-gray-200"
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`text-gray-600 hover:text-black transition ${
          currentPage === totalPages ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <Icons.AngleRight />
      </button>
    </div>
  );
}
