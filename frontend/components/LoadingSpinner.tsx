export default function Spinner({ color = 'text-primary' }) {


  return (
    <div
      className={`animate-spin rounded-full border-t-transparent border-solid 
        h-5 w-5 border-2 md:h-8 md:w-8 md:border-3 
        lg:h-12 lg:w-12 lg:border-4 xl:h-16 xl:w-16 xl:border-6 
        ${color}`}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
