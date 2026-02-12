import Logo from "@/assets/logos/logo.svg?react"; 
import LogoAi4life from "@/assets/logos/logo.svg?react"; 
import LogoHust from "@/assets/logos/logo-hust.svg?react";

import type { SVGProps } from "react";


const Logos = {
  Logo: (props: SVGProps<SVGSVGElement>) => <Logo {...props} />,
  LogoHust: (props: SVGProps<SVGSVGElement>) => <LogoHust {...props} />,
  LogoAi4life: (props: SVGProps<SVGSVGElement>) => <LogoAi4life {...props} />,
};

export { Logos };
export default Logos;

