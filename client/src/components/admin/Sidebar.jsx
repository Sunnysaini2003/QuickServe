import { NavLink, Link } from "react-router-dom";

import {LogOut,
  LayoutDashboard,
  UsersRound,
  Menu,
  ListSortDescending,
  Utensils,
  ListCheck,
  CookingPot


} from "lucide-react";



import "./Sidebar.css";

import logo from "../../assets/qs_logo_1.png";
import api from "../../api/axios";

const Sidebar = () => {
  const menuItems = [
    {
      label: "Dashboard",
      path: "/admin",
      icon: <LayoutDashboard size={16} />,
    },
    {
      label: "Users",
      path: "/admin/users",
      icon: <UsersRound size={16} />,
    },
    {
      label: "Menu",
      path: "/admin/menu",
      icon: <Menu size={16} />,
    },
    {
      label: "Categories",
      path: "/admin/categories",
      icon: <ListSortDescending size={16} />,
    },
    {
      label: "Tables",
      path: "/admin/tables",
      icon: <Utensils size={16} />,
    },
    {
      label: "Orders",
      path: "/admin/orders",
      icon: <ListCheck size={16} />,
    },
    {
      label: "Kitchen",
      path: "/kitchen",
      icon: <CookingPot size={16} />,
    },
  ];

  
  // ADMIN LOGOUT
  

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout", null, {
        _skipAuthRefresh: true,
        headers: {
          "X-QuickServe-Role": "admin",
        },
      });
    } catch (error) {
      console.warn("Admin logout request failed:", error);
    } finally {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
      window.location.href = "/admin/login";
    }
  };

  
  // RENDER
  

  return (
    <aside className="admin-sidebar">
      {/* 
                BRAND
             */}

      <Link to="/admin" className="sidebar-brand-link">
        <img
          src={logo}
          alt="QuickServe Restaurant Management"
          className="sidebar-logo-img"
        />
      </Link>

      {/* 
                NAVIGATION
             */}

      <nav className="sidebar-nav">
        <div className="sidebar-section-title">MAIN MENU</div>

        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/admin"}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
            }
          >
            <span className="sidebar-icon">{item.icon}</span>

            <span className="sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* 
                BOTTOM
             */}

      <div className="sidebar-bottom">
        {/* <button type="button" className="sidebar-logout" onClick={handleLogout}>
          <span className="sidebar-icon">↪</span>

          <span>Logout</span>
        </button> */}

            <button
              type="button"
              className="sidebar-logout"
              onClick={handleLogout}
            >
              <LogOut size={17} />
              <span>Logout</span>
            </button>
      </div>
    </aside>
  );
};

export default Sidebar;
