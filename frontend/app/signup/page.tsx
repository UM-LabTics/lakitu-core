import SignupForm from "./signupForm";
import Image from "next/image";

export default function SignupPage() {
  return (
    <div className="flex flex-col h-full items-center justify-center">
          <Image src="/logotipo.svg" alt="Logo" width={600} height={200} style={{transform:"translateY(-20px)"}} />
          <SignupForm />
    </div>
  );
}