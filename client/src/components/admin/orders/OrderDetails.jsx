import {
    useEffect,
    useState
} from "react";

import {
    getAdminOrderById,
    updateAdminOrderStatus
} from "../../../api/order.api";


function OrderDetails({
    orderId,
    onClose,
    onUpdated
}) {

    const [order, setOrder] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [updating, setUpdating] =
        useState(false);

    const [error, setError] =
        useState("");


    
    // LOAD ORDER
    

    const loadOrder = async () => {

        try {

            setLoading(true);
            setError("");

            const response =
                await getAdminOrderById(
                    orderId
                );

            const data =
                response?.data || response;

            setOrder(data);

        } catch (error) {

            console.error(
                "Failed to load order:",
                error
            );

            setError(
                error?.response?.data?.message ||
                "Failed to load order."
            );

        } finally {

            setLoading(false);

        }
    };


    useEffect(() => {

        if (orderId) {
            loadOrder();
        }

    }, [orderId]);


    
    // STATUS UPDATE
    

    const handleStatusChange = async (
        event
    ) => {

        const newStatus =
            event.target.value;


        try {

            setUpdating(true);

            const response =
                await updateAdminOrderStatus(
                    order.id,
                    newStatus
                );


            const updatedOrder =
                response?.data ||
                response;


            setOrder(
                updatedOrder
            );


            if (onUpdated) {
                onUpdated(
                    updatedOrder
                );
            }

        } catch (error) {

            console.error(
                "Failed to update order status:",
                error
            );

            alert(
                error?.response?.data?.message ||
                "Failed to update order status."
            );

        } finally {

            setUpdating(false);

        }
    };


    
    // HELPERS
    

    const formatCurrency = (
        value
    ) => {

        return Number(
            value || 0
        ).toLocaleString(
            "en-IN",
            {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 2
            }
        );
    };


    const formatDate = (
        value
    ) => {

        if (!value) {
            return "-";
        }

        return new Date(
            value
        ).toLocaleString(
            "en-IN",
            {
                dateStyle: "medium",
                timeStyle: "short"
            }
        );
    };


    const formatMode = (
        mode
    ) => {

        if (mode === "DineIn") {
            return "Dine In";
        }

        return mode || "-";
    };


    if (!orderId) {
        return null;
    }


    return (

        <div
            className="order-details-overlay"
            onClick={onClose}
        >

            <aside
                className="order-details-drawer"
                onClick={(event) =>
                    event.stopPropagation()
                }
            >

                {/* 
                    HEADER
                 */}

                <div className="order-details-header">

                    <div>

                        <span>
                            Order Details
                        </span>

                        <h2>

                            #
                            {
                                order?.order_number ||
                                "..."
                            }

                        </h2>

                    </div>


                    <button
                        type="button"
                        className="order-details-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>

                </div>


                {/* 
                    LOADING
                 */}

                {loading && (

                    <div className="order-details-state">

                        <div className="orders-spinner" />

                        <span>
                            Loading order...
                        </span>

                    </div>

                )}


                {/* 
                    ERROR
                 */}

                {!loading && error && (

                    <div className="order-details-state error">

                        <strong>
                            Unable to load order
                        </strong>

                        <p>
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={
                                loadOrder
                            }
                        >
                            Try Again
                        </button>

                    </div>

                )}


                {/* 
                    CONTENT
                 */}

                {!loading &&
                    !error &&
                    order && (

                    <div className="order-details-content">


                        {/* STATUS */}

                        <section className="order-details-section">

                            <div className="section-heading">

                                <span>
                                    Order Status
                                </span>

                            </div>


                            <select
                                value={
                                    order.status
                                }
                                onChange={
                                    handleStatusChange
                                }
                                disabled={
                                    updating
                                }
                                className={`order-details-status ${order.status
                                    ?.toLowerCase()
                                    .replace(
                                        /\s+/g,
                                        "-"
                                    )}`}
                            >

                                <option value="Pending">
                                    Pending
                                </option>

                                <option value="Preparing">
                                    Preparing
                                </option>

                                <option value="Ready">
                                    Ready
                                </option>

                                <option value="Served">
                                    Served
                                </option>

                                <option value="Cancelled">
                                    Cancelled
                                </option>

                            </select>


                            {updating && (

                                <small className="status-updating">
                                    Updating status...
                                </small>

                            )}

                        </section>


                        {/* CUSTOMER */}

                        <section className="order-details-section">

                            <div className="section-heading">
                                Customer
                            </div>


                            <div className="detail-row">

                                <span>
                                    Name
                                </span>

                                <strong>
                                    {
                                        order.customer_name ||
                                        "Walk-in Customer"
                                    }
                                </strong>

                            </div>


                            <div className="detail-row">

                                <span>
                                    Mobile
                                </span>

                                <strong>
                                    {
                                        order.customer_mobile ||
                                        "-"
                                    }
                                </strong>

                            </div>

                        </section>


                        {/* ORDER INFORMATION */}

                        <section className="order-details-section">

                            <div className="section-heading">
                                Order Information
                            </div>


                            <div className="detail-row">

                                <span>
                                    Mode
                                </span>

                                <strong>
                                    {
                                        formatMode(
                                            order.order_mode
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="detail-row">

                                <span>
                                    Order Type
                                </span>

                                <strong>
                                    {
                                        order.order_type ||
                                        "-"
                                    }
                                </strong>

                            </div>


                            <div className="detail-row">

                                <span>
                                    Table
                                </span>

                                <strong>
                                    {
                                        order.table_number
                                            ? `Table ${order.table_number}`
                                            : "Takeaway"
                                    }
                                </strong>

                            </div>


                            <div className="detail-row">

                                <span>
                                    Order Date
                                </span>

                                <strong>
                                    {
                                        formatDate(
                                            order.created_at
                                        )
                                    }
                                </strong>

                            </div>


                            {order.estimated_ready_time && (

                                <div className="detail-row">

                                    <span>
                                        Estimated Time
                                    </span>

                                    <strong>
                                        {
                                            order.estimated_ready_time
                                        }{" "}
                                        min
                                    </strong>

                                </div>

                            )}

                        </section>


                        {/* ITEMS */}

                        <section className="order-details-section">

                            <div className="section-heading">

                                Items

                                <span>
                                    {
                                        order.items?.length ||
                                        0
                                    }
                                </span>

                            </div>


                            <div className="order-items">

                                {order.items?.length ? (

                                    order.items.map(
                                        (item) => (

                                            <div
                                                className="order-item"
                                                key={
                                                    item.id
                                                }
                                            >

                                                <div className="order-item-info">

                                                    <strong>
                                                        {
                                                            item.name
                                                        }
                                                    </strong>

                                                    <span>

                                                        ₹
                                                        {Number(
                                                            item.price ||
                                                            0
                                                        ).toFixed(2)}

                                                        {" × "}

                                                        {
                                                            item.quantity
                                                        }

                                                    </span>


                                                    {item.notes && (

                                                        <small>
                                                            {
                                                                item.notes
                                                            }
                                                        </small>

                                                    )}

                                                </div>


                                                <strong>
                                                    {
                                                        formatCurrency(
                                                            item.subtotal
                                                        )
                                                    }
                                                </strong>

                                            </div>

                                        )
                                    )

                                ) : (

                                    <div className="no-items">
                                        No items found.
                                    </div>

                                )}

                            </div>

                        </section>


                        {/* NOTES */}

                        {order.notes && (

                            <section className="order-details-section">

                                <div className="section-heading">
                                    Notes
                                </div>

                                <div className="order-notes">
                                    {order.notes}
                                </div>

                            </section>

                        )}


                        {/* TOTAL */}

                        <div className="order-details-total">

                            <span>
                                Total
                            </span>

                            <strong>
                                {
                                    formatCurrency(
                                        order.total
                                    )
                                }
                            </strong>

                        </div>

                    </div>

                )}

            </aside>

        </div>

    );
}


export default OrderDetails;