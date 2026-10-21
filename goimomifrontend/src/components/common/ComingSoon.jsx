import React from "react";
import { FaCalendarAlt, FaEnvelope } from "react-icons/fa";
import usePageSEO from "../../hooks/usePageSEO";
import api from "../../api";

const ComingSoon = ({ title, description }) => {
  usePageSEO(
    `${title || "Coming Soon"} | Goimomi Holidays`,
    description || "This feature is currently under development. Stay tuned for the launch from Goimomi Holidays!"
  );
  const [email, setEmail] = React.useState("");
  const [subscribed, setSubscribed] = React.useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (email) {
      try {
        await api.post('/api/enquiry-form/', {
          name: 'Newsletter Subscriber',
          email: email.trim(),
          phone: '9999999999',
          destination: title || 'Feature Launch Subscription',
          purpose: `Launch notification subscriber for: ${title || 'Coming Soon'}`,
          enquiry_type: 'General',
        });
      } catch (err) {
        console.warn("Subscriber lead sync notice:", err);
      }
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        
        {/* Animated Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-20 blur-2xl"></div>
            <FaCalendarAlt className="text-6xl text-[#14532d] relative z-10" />
          </div>
        </div>

        {/* Main Content */}
        <h1 className="text-5xl md:text-6xl font-bold text-gray-800 mb-4">
          Coming <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14532d] to-purple-600">Soon</span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-600 mb-4">
          {title || "We're working on something exciting!"}
        </p>

        <p className="text-lg text-gray-500 mb-10 leading-relaxed">
          {description || "This feature is currently under development. We'll be launching it soon with amazing features and exclusive offers. Stay tuned!"}
        </p>

        {/* Newsletter Signup */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <p className="text-gray-700 font-semibold mb-4">Get notified when we launch</p>
          
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <FaEnvelope className="absolute left-4 top-4 text-gray-400" />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            <button
              type="submit"
              className="bg-gradient-to-r from-[#14532d] to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition transform hover:scale-105"
            >
              Notify Me
            </button>
          </form>

          {subscribed && (
            <p className="text-green-600 font-semibold mt-4 animate-bounce">
              ✓ Thanks! We'll notify you soon.
            </p>
          )}
        </div>

        {/* Features Coming */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition">
            <div className="text-3xl mb-3">🚀</div>
            <h3 className="font-semibold text-gray-800 mb-2">Fast & Reliable</h3>
            <p className="text-gray-600 text-sm">Optimized for the best experience</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition">
            <div className="text-3xl mb-3">💎</div>
            <h3 className="font-semibold text-gray-800 mb-2">Premium Features</h3>
            <p className="text-gray-600 text-sm">Exclusive benefits for our users</p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="font-semibold text-gray-800 mb-2">Easy to Use</h3>
            <p className="text-gray-600 text-sm">Intuitive and user-friendly</p>
          </div>
        </div>

        {/* Call to Action */}
        <p className="text-gray-600">
          In the meantime, explore our other services or{" "}
          <a href="/" className="text-[#14532d] font-semibold hover:underline">
            return to home
            Return to Home
          </a>
        </p>
      </div>
    </div>
  );
};

export default ComingSoon;
