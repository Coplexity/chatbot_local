import Logo from "@/assets/logos/logo.svg?react"; 
import LogoAi4life from "@/assets/logos/logo.svg?react"; 
import LogoHust from "@/assets/logos/logo-hust.svg?react";
import LogoMedicalChatbot from "@/assets/logos/medical-chatbot.svg?react";

import type { SVGProps } from "react";


const Logos = {
  Logo: (props: SVGProps<SVGSVGElement>) => <Logo {...props} />,
  LogoHust: (props: SVGProps<SVGSVGElement>) => <LogoHust {...props} />,
  LogoAi4life: (props: SVGProps<SVGSVGElement>) => <LogoAi4life {...props} />,
  LogoMedicalChatbot: (props: SVGProps<SVGSVGElement>) => <LogoMedicalChatbot {...props} />,
};

export { Logos };
export default Logos;

