import React from "react";

const TravelBot = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-24 pb-16">
      <div className="flex-grow flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl w-full text-center">
          <h1 className="text-4xl font-bold text-[#14532d] mb-6">AI Travel Agent</h1>
          <p className="text-gray-600 mb-8">
            Welcome to our intelligent travel assistant! Plan your perfect trip with AI.
          </p>
          <div className="w-full h-[600px] bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
            <iframe
              src="http://localhost:8001/simulator"
              title="Travel Agent Simulator"
              className="w-full h-full border-none"
              allow="microphone;"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TravelBot;
