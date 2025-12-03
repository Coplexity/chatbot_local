import Logos from "../logos/logos";

export function Header({
  itemNavigation,
  activeLink,
  onNavigate,
}: {
  itemNavigation: {
    name: string;
    icon: React.ElementType;
    link: string;
  }[];
  activeLink: string;
  onNavigate: (link: string) => void;
}) {
  return (
    <header className="bg-dark-blue flex items-center px-30 justify-between">
      <Logos.Logo className="h-8 my-5" />
      <nav className="flex space-x-4 h-full">
        {itemNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeLink === item.link;
          return (
            <div
              key={item.name}
              className={`flex items-center justify-center gap-4 transition-colors px-4 cursor-pointer ${
                isActive
                  ? "text-white border-b-6 border-primary-blue font-bold"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => onNavigate(item.link)}
            >
              <Icon />
              <span className="text-base">{item.name}</span>
            </div>
          );
        })}
      </nav>
    </header>
  );
}
