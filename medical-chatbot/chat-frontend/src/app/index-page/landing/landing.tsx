import Logos from "@/components/logos/logos";
import { useNavigate } from "@tanstack/react-router";

export function LandingComponent() {
  const navigate = useNavigate();
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-white gap-y-3">
      <Logos.Logo className="w-1/3 h-1/3" />
      <button
        onClick={() =>
          navigate({
            to: "/chat",
            search: { chatId: undefined },
          })
        }
        className="px-6 py-3 bg-[#3E784E] text-white font-medium rounded-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3E784E] transition ease-in-out duration-150"
      >
        Start
      </button>
    </div>
  );
}
