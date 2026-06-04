import LoginForm from "./loginForm";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="hidden lg:flex w-3/8 m-8 flex-col justify-between items-baseline h-full pt-16">
        <Image src="/isotipo.svg" alt="Lakitu" width={1000} height={1000} />
        <div className="relative w-full h-1/8">
          <Image src="/sombra.svg" alt="Sombra" width={400} height={22} style={{position:"absolute", top:"0", left:"0", transform:"translateX(-20px)" }}/>
          <Image src="/sombra.svg" alt="Sombra" width={230} height={13} style={{position:"absolute", bottom:"0", right:"0", transform:"translateX(-30px)" }}/>        
        </div>
      </div>

      <div className="h-full flex flex-1 flex-col justify-baseline items-center pt-8" >
          <Image src="/logotipo.svg" alt="Logo" width={600} height={200} style={{transform:"translateY(-20px)"}} />
          <LoginForm />
      </div>
    </div>
  );
}