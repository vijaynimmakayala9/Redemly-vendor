import React, { useState, useEffect } from "react";
import { FaChevronDown } from "react-icons/fa";
import { Link, useLocation, useNavigate } from "react-router-dom";

const Sidebar = ({ isCollapsed, isMobile, setIsCollapsed }) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [activeItem, setActiveItem] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  // Check active item on route change
  useEffect(() => {
    const currentPath = location.pathname;

    const findActiveItem = () => {
      for (const element of elements) {
        if (element.path === currentPath) {
          setActiveItem(element.name);
          return;
        }

        if (element.dropdown) {
          const found = element.dropdown.find(item => item.path === currentPath);
          if (found) {
            setActiveItem(element.name);
            setOpenDropdown(element.name);
            return;
          }
        }
      }

      setActiveItem("");
    };

    findActiveItem();
  }, [location.pathname]);

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const handleLogout = () => {
    localStorage.removeItem("vendorId");
    localStorage.removeItem("vendorToken");
    window.location.href = "/";
  };

  // Close sidebar when clicking a link on mobile
  const handleMobileLinkClick = () => {
    if (isMobile) {
      setIsCollapsed(true);
      setOpenDropdown(null);
    }
  };

  const elements = [
    {
      icon: <i className="ri-home-fill"></i>,
      name: "Home",
      path: "/dashboard",
    },
    {
      icon: <i className="ri-user-3-fill"></i>,
      name: "Profile",
      path: "/profile",
      dropdown: [
        { name: "My Profile", path: "/profile" }
      ]
    },
    {
      icon: <i className="ri-building-fill"></i>,
      name: "Coupons",
      path: "/coupons",
      dropdown: [
        { name: "Add Coupon", path: "/create-coupon" },
        { name: "All Coupons", path: "/coupons" },
        { name: "Coupons History", path: "/couponshistory" },
      ],
    },
    {
      icon: <i className="ri-file-search-fill"></i>,
      name: "Documents",
      path: "/docs",
      dropdown: [
        { name: "Upload Documents", path: "/upload-docs" },
        { name: "Documents List", path: "/docs" },
      ],
    },
    {
      icon: <i className="ri-money-dollar-circle-fill"></i>,
      name: "Payments",
      path: "/paymentsummary",
      dropdown: [
        // { name: "Payment Due", path: "/paymentlist" },
        { name: "Payment Summary", path: "/paymentsummary" },
        // { name: "Payment History", path: "/payment-history" }
      ],
    },
    {
      icon: <i className="ri-notification-3-fill"></i>,
      name: "Notifications",
      path: "/notifications",
      dropdown: [
        { name: "All Notifications", path: "/notifications" },
      ],
    },
    // {
    //   icon: <i className="ri-survey-fill text-white"></i>,
    //   name: "Survey",
    //   path: "/surveylist",
    //   dropdown: [
    //     { name: "Create Survey", path: "/createsurvey" },
    //     { name: "Get All Surveys", path: "/surveylist" },
    //     { name: "Submitted Surveys", path: "/submitted-survey" },
    //   ],
    // },
    {
      icon: <i className="ri-logout-box-fill"></i>,
      name: "Logout",
      action: handleLogout,
    },
  ];

  const isDropdownItemActive = (dropdownItems) => {
    return dropdownItems.some(item => item.path === location.pathname);
  };

  return (
    <aside
      className={`sidebar fixed md:relative h-full transition-all duration-300 z-50
        ${isMobile
          ? (isCollapsed
            ? '-translate-x-full'
            : 'translate-x-0 w-64')
          : isCollapsed
            ? 'w-0 md:w-16'
            : 'w-64'
        }`}
      style={{
        height: isMobile ? '100vh' : 'calc(100vh)',
        top: isMobile ? 0 : 'auto'
      }}
    >
      <div className="h-full bg-blue-800 overflow-y-auto no-scrollbar flex flex-col">
        {/* Close button for mobile */}
        {isMobile && !isCollapsed && (
          <div className="flex justify-end p-4 md:hidden">
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-white hover:text-yellow-300 text-2xl"
              aria-label="Close sidebar"
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        )}

        {/* Dashboard Title */}
        <div className="sticky top-0 p-4 font-bold text-white text-center bg-blue-800 z-10">
          {!isCollapsed || isMobile ? (
            <span className="text-lg md:text-xl">Vendor Dashboard</span>
          ) : (
            <div className="flex justify-center">
              <span className="text-lg">VD</span>
            </div>
          )}
        </div>

        <div className="border-b-4 border-gray-800 my-2"></div>

        {/* Navigation Items */}
        <nav className="flex flex-col space-y-2 p-2 md:p-4">
          {elements.map((item, idx) => (
            <div key={idx} className="sidebar-item">
              {item.dropdown ? (
                <>
                  <div
                    className={`flex items-center py-3 px-3 font-bold text-sm rounded-lg duration-300 cursor-pointer
                      ${activeItem === item.name || isDropdownItemActive(item.dropdown)
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                        : 'text-white hover:bg-[#333333] hover:text-[#00B074]'
                      }`}
                    onClick={() => {
                      toggleDropdown(item.name);
                      navigate(item.path);
                    }}
                  >
                    <span className={`text-xl min-w-[24px] flex justify-center
                      ${activeItem === item.name || isDropdownItemActive(item.dropdown)
                        ? 'text-yellow-300'
                        : 'text-white'}`}
                    >
                      {item.icon}
                    </span>
                    {(!isCollapsed || isMobile) && (
                      <>
                        <span className="ml-3 flex-1">{item.name}</span>
                        <FaChevronDown
                          className={`ml-2 text-xs transform transition-transform duration-300 ${openDropdown === item.name ? "rotate-180" : ""
                            } ${activeItem === item.name || isDropdownItemActive(item.dropdown)
                              ? 'text-yellow-300'
                              : 'text-white'}`}
                        />
                      </>
                    )}
                  </div>

                  {(isCollapsed && !isMobile) && (activeItem === item.name || isDropdownItemActive(item.dropdown)) && (
                    <div className="absolute left-0 top-0 h-full w-1 bg-yellow-400 rounded-r"></div>
                  )}

                  {openDropdown === item.name && (!isCollapsed || isMobile) && (
                    <ul className="ml-8 md:ml-12 mt-1 space-y-1 text-sm text-white animate-fadeIn">
                      {item.dropdown.map((subItem, subIdx) => (
                        <li key={subIdx}>
                          <Link
                            to={subItem.path}
                            className={`flex items-center space-x-2 py-2 font-medium cursor-pointer rounded-lg px-2
                              ${location.pathname === subItem.path
                                ? 'bg-blue-600 text-white'
                                : 'hover:bg-blue-700 hover:text-white'
                              }`}
                            onClick={handleMobileLinkClick}
                          >
                            <span className={`${location.pathname === subItem.path ? 'text-yellow-300' : 'text-blue-400'}`}>
                              •
                            </span>
                            <span>{subItem.name}</span>
                            {location.pathname === subItem.path && (
                              <span className="ml-auto">
                                <i className="ri-arrow-right-s-line"></i>
                              </span>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  className={`relative flex items-center py-3 px-3 font-bold text-sm rounded-lg duration-300
                    ${location.pathname === item.path
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                      : 'text-white hover:bg-[#333333] hover:text-[#00B074]'
                    }`}
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    }
                    handleMobileLinkClick();
                  }}
                >
                  <span className={`text-xl min-w-[24px] flex justify-center
                    ${location.pathname === item.path ? 'text-yellow-300' : 'text-white'}`}
                  >
                    {item.icon}
                  </span>
                  {(!isCollapsed || isMobile) && (
                    <span className="ml-3">{item.name}</span>
                  )}

                  {(isCollapsed && !isMobile) && location.pathname === item.path && (
                    <div className="absolute left-0 top-0 h-full w-1 bg-yellow-400 rounded-r"></div>
                  )}

                  {(!isCollapsed || isMobile) && location.pathname === item.path && (
                    <span className="ml-auto">
                      <i className="ri-arrow-right-s-line text-yellow-300"></i>
                    </span>
                  )}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;