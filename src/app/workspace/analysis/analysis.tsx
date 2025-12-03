import Icons from "@/components/icons/icons";
import { Link } from "@tanstack/react-router";
import { UploadDraft } from "./upload-draft/upload-draft";
import { AnalysisResult } from "./analysis-result/analysis-result";
import { useState } from "react";

export function Analysis() {
  const [showResult, setShowResult] = useState(false);
  const handleCheck = () => {
    setShowResult(true);
  };
  return (
    <div className="pb-10 space-y-12">
      <div className="my-10 flex gap-4 items-center">
        <Link to="/homepage" className="text-primary-blue no-underline">
          {" "}
          Trang chủ{" "}
        </Link>
        <Icons.AngleRight />
        <Link to="/analysis" className="font-bold text-black no-underline">
          {" "}
          Phân tích{" "}
        </Link>
      </div>
      <UploadDraft onCheck={handleCheck} showResult={showResult} />
      {showResult && <AnalysisResult />}
    </div>
  );
}
