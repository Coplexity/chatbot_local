import Logos from "../logos/logos";
import Icons from "../icons/icons";

export default function Navigation() {
  const history = [
    "Triệu chứng viêm phổi",
    "Triệu chứng sốt xuất huyết",
    "Phòng ngừa bệnh viêm da cơ địa",
    "Triệu chứng cúm A",
  ];

  return (
    <div className="w-full p-6 border-r border-[#EBEBEB] min-h-screen flex flex-col gap-6">
      <div className="flex justify-center mb-6">
        <Logos.Logo className="h-6" />
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Tìm kiếm"
          className="w-full px-4 py-2 pl-8 rounded-full border border-[#EBEBEB] focus:outline-none text-grey-500"
        />
        <Icons.SearchIcon className="absolute left-2 top-3 h-4" />
      </div>

      <div className="font-bold mt-6 ">Lịch sử trò chuyện</div>

      <ul className="px-4 space-y-6">
        {history.map((item, index) => (
          <li
            key={index}
            className="hover:text-blue-500 cursor-pointer transition"
          >
            <span className="block truncate">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
