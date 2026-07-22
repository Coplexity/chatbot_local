import Icons from "@/components/icons/icons";
import { Select } from "antd";

export function SearchDocument() {
  return (
    <div className="border border-design-border flex rounded-sm">
      <label className="py-2 px-6 flex justify-start items-center gap-2 border-r border-design-border text-[#AEAEAE] cursor-pointer w-9/16">
        <Icons.Search />
        <input
          type="text"
          placeholder="Nhập văn bản cần tìm kiếm"
          className="outline-none bg-transparent text-black"
        />
      </label>

      <Select
        placeholder="Lọc theo trạng thái"
        suffixIcon={<Icons.AngleDown className="text-[#AEAEAE]" />}
        className="status-filter-select w-6/16"
        options={[
          { value: "chua-xu-ly", label: "Chưa xử lý" },
          { value: "dang-xu-ly", label: "Đang xử lý" },
          { value: "da-xu-ly", label: "Đã xử lý" },
        ]}
        onChange={(value) => console.log("Selected:", value)}
      />

      <Select
        placeholder="Chủ đề"
        suffixIcon={<Icons.AngleDown className="text-[#AEAEAE]" />}
        className="status-filter-select w-6/16"
        options={[
          { value: "Đất đai", label: "Đất đai" },
          { value: "Giao thông", label: "Giao thông" },
        ]}
        onChange={(value) => console.log("Selected:", value)}
      />

      <button className="py-2 px-6 flex justify-center items-center gap-2 bg-primary-blue text-white rounded-r-sm w-3/19 ">
        <Icons.Search />
        <span>Tìm kiếm</span>
      </button>
    </div>
  );
}
