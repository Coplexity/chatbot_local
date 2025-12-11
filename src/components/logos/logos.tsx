import Logo from "@/assets/logos/logo.svg?react"; 
import LogoHust from "@/assets/logos/logo-hust.svg?react";

import type { SVGProps } from "react";


const Logos = {
  Logo: (props: SVGProps<SVGSVGElement>) => <Logo {...props} />,
  LogoHust: (props: SVGProps<SVGSVGElement>) => <LogoHust {...props} />,
};

export { Logos };
export default Logos;

