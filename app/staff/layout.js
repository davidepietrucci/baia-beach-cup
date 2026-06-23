export default function StaffLayout({ children }) {
  return (
    <div className="min-h-screen relative">
      <div 
        className="fixed inset-0 -z-10" 
        style={{
          backgroundImage: "url('/bg_main.jpg')",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center"
        }}
      />
      <div className="fixed inset-0 -z-10 bg-white/20 backdrop-blur-[2px]" />
      {children}
    </div>
  );
}
