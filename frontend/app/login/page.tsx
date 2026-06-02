import LoginForm from "./loginForm";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="hidden md:flex w-1/3 mr-16 flex-col justify-between items-baseline h-full pt-16">
        <Image src="/isotipo.svg" alt="Lakitu" width={1000} height={1000} />
        <div className="relative w-full h-1/8">
          <Image src="/sombra.svg" alt="Sombra" width={320} height={10} style={{position:"absolute", top:"0", left:"0", transform:"translateX(-20px)" }}/>
          <Image src="/sombra.svg" alt="Sombra" width={180} height={50} style={{position:"absolute", bottom:"0", right:"0", transform:"translateX(-20px)" }}/>        
        </div>
      </div>
      <div>
        <LoginForm />
      </div>
    </div>
  );
}