import Icons from "@/components/icons/icons";

export function DocumentTable({ documentList }: { documentList: any[] }) {
  const tableHeaders = [
    "Tên văn bản",
    "Thời gian",
    "Chủ đề",
    "Trạng thái",
    "Thao tác",
  ];
  return (
    <table className="w-full rounded-sm overflow-hidden border border-design-border">
      <thead className="bg-[#D6D8E5] font-bold border-b border-design-border">
        <tr>
          <th className="py-3 px-4 text-left">
            <input
              type="checkbox"
              className="rounded"
              //   checked={allChecked}
              //   onChange={(e) => onSelectAll(e.target.checked)}
            />
          </th>
          {tableHeaders.map((header) => (
            <th key={header} className="py-3 px-4 text-left">
              {header}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {documentList.map((document, index) => {
          const rowBg = index % 2 === 0 ? "bg-white" : "bg-[#F9F9F9]";
          const statusColorBgMap: { [key: string]: string } = {
            "Chưa xử lý": "bg-[#e9e9e9] text-[#6b7280]",
            "Đang xử lý": "bg-[#fff7e4] text-[#f4801a]",
            "Đã xử lý - Không tốt": "bg-[#fde5e5] text-[#f41e1e]",
            "Đã xử lý - Bình thường": "bg-[#daedfc] text-[#0f83d0]",
            "Đã xử lý - Tốt": "bg-[#d9f6e0] text-[#0f9d2f]",
          };

          return (
            <tr
              key={document.id}
              className={` ${rowBg} font-normal hover:bg-[#E8EBF5] transition-colors`}
            >
              <td className="py-4 px-4 text-left">
                <input
                  type="checkbox"
                  className="rounded"
                  // checked={selectedDocuments.includes(document.id)}
                  // onChange={(e) => onSelectDocument(document.id, e.target.checked)}
                />
              </td>
              <td className="py-4 px-4 text-left font-bold">{document.name}</td>
              <td className="py-4 px-4 text-left">{document.date}</td>
              <td className="py-4 px-4 text-left">{document.topic}</td>
              <td className="py-4 px-4 text-left">
                <span
                  className={`${
                    statusColorBgMap[document.status]
                  } px-4 py-2 rounded-sm`}
                >
                  {document.status}
                </span>
              </td>
              <td className="py-4 px-4 flex justify-start gap-4 text-gray-500 font-bold">
                <button
                  className="cursor-pointer"
                  onClick={() => console.log("View document", document.id)}
                >
                  <Icons.Eye />
                </button>

                <button
                  className="cursor-pointer"
                  onClick={() => console.log("Download document", document.id)}
                >
                  <Icons.FileDownload />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
