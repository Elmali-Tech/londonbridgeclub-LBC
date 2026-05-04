import React from "react";
import Link from "next/link";

export default function MembershipPlans() {
  return (
    <section className="py-16 bg-black text-white" id="plans">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">OUR PLANS</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Choose the perfect plan tailored to your needs. Whether you&apos;re
            an individual looking for flexibility or a corporation seeking
            comprehensive benefits.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Corporate Membership */}
          <div className="bg-gray-900 p-8 rounded-sm shadow-lg border border-gray-800 hover:border-amber-500/20 transition-all">
            <h3 className="text-center text-xl font-bold uppercase mb-4">
              Corporate Membership
            </h3>
            <p className="text-center text-gray-400 mb-2">Classic</p>
            <div className="text-center mb-4">
              <span className="text-4xl font-bold">£250</span>
              <span className="text-gray-400">/mo</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center text-gray-300">
                <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                <span>Eius tempor</span>
              </li>
              <li className="flex items-center text-gray-300">
                <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                <span>Adipiscing connect</span>
              </li>
              <li className="flex items-center text-gray-300">
                <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                <span>Voluptatem quis voluptas</span>
              </li>
            </ul>
            <Link
              href="/membership"
              className="block text-center bg-lime-500 hover:bg-lime-600 text-black font-medium py-3 px-4 rounded-sm transition-all"
            >
              GET NOW
            </Link>
          </div>

          {/* Individual Membership */}
          <div className="bg-gray-900 p-8 rounded-sm shadow-lg border border-gray-800 hover:border-amber-500/20 transition-all">
            <h3 className="text-center text-xl font-bold uppercase mb-4">
              Individual Membership
            </h3>
            <p className="text-center text-gray-400 mb-2">Classic</p>
            <div className="text-center mb-4">
              <span className="text-4xl font-bold">£100</span>
              <span className="text-gray-400">/mo</span>
            </div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center text-gray-300">
                <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                <span>Eius tempor</span>
              </li>
              <li className="flex items-center text-gray-300">
                <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                <span>Adipiscing connect</span>
              </li>
              <li className="flex items-center text-gray-300">
                <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                <span>Voluptatem quis voluptas</span>
              </li>
            </ul>
            <Link
              href="/membership"
              className="block text-center bg-lime-500 hover:bg-lime-600 text-black font-medium py-3 px-4 rounded-sm transition-all"
            >
              GET NOW
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
