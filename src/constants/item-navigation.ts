import Icons from "@/components/icons/icons";

export const itemNavigation = [
  {
    name: "Trang chủ",
    icon: Icons.Home,
    link: "/homepage",
    titleSection: "Trang chủ",
  },
  {
    name: "Quản lý văn bản",
    icon: Icons.FileAlt,
    link: "/document-management",
    titleSection: "Quản lý văn bản",
  },
  {
    name: "Phân tích",
    icon: Icons.LineChart,
    link: "/analysis",
    titleSection: "Phân tích tương thích pháp lý",
  },
  {
    name: "Hồ sơ",
    icon: Icons.FolderOpen,
    link: "/profile",
    titleSection: "Hồ sơ",
  },
  { name: "Thoát", icon: Icons.DoorOpen, link: "/login" },
];
