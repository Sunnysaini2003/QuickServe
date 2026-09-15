import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import "./AdminLayout.css";
// import "../../styles/admin.css";

const AdminLayout = () => {
    return (
        <div className="admin-layout">

            <Sidebar />

            <main className="admin-main">
                <Outlet />
            </main>

        </div>
    );
};

export default AdminLayout;