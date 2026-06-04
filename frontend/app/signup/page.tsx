import SignupForm from "./signupForm";
import Image from "next/image";

export default function SignupPage() {
  return (
    <div className="flex flex-col h-full items-center justify-center">
          <Image src="/logotipo.svg" alt="Logo" width={500} height={180} style={{transform:"translateY(-20px)"}} />
          <div className="w-full relative flex-1" >
            <div className="hidden lg:block absolute top-0 right-[calc(100%/6-50px)] -translate-y-25 scale-x-[-1]">
              <Image src="/isotipo.svg" alt="Lakitu" width={250} height={250}/>
            </div>
            <SignupForm />
          </div>
    </div>
  );
}