import { useState, useEffect, useRef } from "react";
import Sidebar from "../Components/Sidebar";
import Navbar from "../Components/Navbar";

export default function AdminLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isMobile && 
        !isCollapsed && 
        sidebarRef.current && 
        !sidebarRef.current.contains(event.target) &&
        !event.target.closest('.navbar-toggle-button')
      ) {
        setIsCollapsed(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMobile, isCollapsed]);

  useEffect(() => {
    if (isMobile && !isCollapsed) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMobile, isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    // 1. Added w-full and screen bounds to the wrapper
    <div className="flex h-screen w-full relative overflow-hidden bg-[#EFF0F1]">
      
      {/* Overlay for mobile */}
      {isMobile && !isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Sidebar Wrapper: 
          On Desktop, it needs a fixed or transition width so the content knows how to shrink.
          On Mobile, it should be fixed/absolute to not push the layout. */}
      <div 
        ref={sidebarRef}
        className={`transition-all duration-300 ease-in-out z-50 ${
          isMobile 
            ? "fixed inset-y-0 left-0" 
            : (isCollapsed ? "w-20" : "w-64")
        }`}
      >
        <Sidebar 
          isCollapsed={isCollapsed} 
          isMobile={isMobile} 
          setIsCollapsed={setIsCollapsed}
        />
      </div>

      {/* Main Content:
          2. Added min-w-0: This is the critical fix for overflow. 
          3. Added h-full and w-full to ensure it respects the parent bounds. */}
      <div className="flex-1 flex flex-col min-w-0 w-full h-full transition-all duration-300">
        
        {/* Navbar */}
        <Navbar 
          setIsCollapsed={setIsCollapsed} 
          isCollapsed={isCollapsed}
          isMobile={isMobile}
          toggleSidebar={toggleSidebar}
        />
        
        {/* Page Content:
            4. overflow-x-hidden ensures no horizontal scroll on the content itself. */}
        <main className="p-3 sm:p-4 md:p-6 overflow-y-auto overflow-x-hidden flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}