import Logo from "@/assets/logos/logo.svg?react"; 

import type { SVGProps } from "react";


const Logos = {
  Logo: (props: SVGProps<SVGSVGElement>) => <Logo {...props} />,
};

export { Logos };
export default Logos;

