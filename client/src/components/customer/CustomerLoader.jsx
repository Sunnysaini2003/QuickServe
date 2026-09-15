
import plateIcon from "../../assets/qs_icon.png";
const CustomerLoader = ({ message = "Please wait..." }) => {
  return (
    <div className="customer-loader">
      <div className="customer-loader-content">
        {/* Animated plate */}
        <div className="customer-loader-icon">
          <div className="loader-ring loader-ring-outer" />

          <div className="loader-ring loader-ring-middle" />

          <div className="loader-plate">
            {/* Replace the span with the img tag */}
            <img src={plateIcon} alt="Loading plate" className="plate-icon" />
          </div>
        </div>

        {/* Branding */}
        <div className="customer-loader-brand">
          <span>Quick</span>Serve
        </div>

        {/* Message */}
        <p className="customer-loader-message">{message}</p>

        {/* Animated dots */}
        <div className="customer-loader-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
};

export default CustomerLoader;
