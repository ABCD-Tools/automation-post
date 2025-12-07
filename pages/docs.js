import Link from "next/link";
import Navbar from "@components/Navbar";

const Docs = () => {
  const developerSteps = [
    {
      step: 1,
      title: "Install Prerequisites",
      description: "Install Node.js (v18+) and pnpm globally",
      code: "npm install -g pnpm",
    },
    {
      step: 2,
      title: "Clone & Install",
      description: "Clone the repository and install dependencies",
      code: "git clone <repo>\ncd abcd-tools\npnpm install",
    },
    {
      step: 3,
      title: "Setup Environment",
      description: "Create .env.local with Supabase credentials",
      code: "NEXT_PUBLIC_SUPABASE_URL=...\nNEXT_PUBLIC_SUPABASE_ANON_KEY=...",
    },
    {
      step: 4,
      title: "Run Migrations",
      description: "Set up the database",
      code: "pnpm migrate",
    },
    {
      step: 5,
      title: "Start Development",
      description: "Run the development server",
      code: "pnpm dev",
    },
  ];

  const userSteps = [
    {
      step: 1,
      title: "Create Account",
      description: "Register on the website with your email and password",
      icon: "📧",
    },
    {
      step: 2,
      title: "Install Agent",
      description: "Download and install the agent from the Clients page",
      icon: "⬇️",
    },
    {
      step: 3,
      title: "Add Accounts",
      description: "Add your social media accounts (Instagram, Facebook, Twitter)",
      icon: "🔐",
    },
    {
      step: 4,
      title: "Create Posts",
      description: "Upload images, write captions, and select target accounts",
      icon: "📝",
    },
    {
      step: 5,
      title: "Wake Agent",
      description: "Click 'Wake Up' to process all queued posts",
      icon: "🚀",
    },
  ];

  const devCommands = [
    { command: "pnpm dev", description: "Start development server" },
    { command: "pnpm build", description: "Build for production" },
    { command: "pnpm start", description: "Start production server" },
    { command: "pnpm record", description: "Record a new workflow" },
    { command: "pnpm migrate", description: "Run database migrations" },
    { command: "pnpm seed", description: "Seed database with sample data" },
  ];

  const visualApproach = [
    {
      title: "Traditional Selector Approach ❌",
      description: "Breaks when UI changes",
      code: `// Breaks when Instagram changes CSS class
button.login-btn  // ❌ Fails if class renamed to .sign-in-button`,
      color: "border-red-200 bg-red-50",
    },
    {
      title: "Visual Recording Approach ✅",
      description: "Works even if UI changes",
      code: `{
  visual: {
    screenshot: "...",      // Visual match
    text: "Log In",          // Text match
    position: { x: 50%, y: 40% },  // Position match
  },
  backup_selector: "button.login-btn"  // Fast fallback
}`,
      color: "border-green-200 bg-green-50",
    },
  ];

  const benefits = [
    "Robust Against UI Changes",
    "Visual Matching with Screenshots",
    "Multiple Fallbacks",
    "Human-Like Behavior",
    "Self-Healing Automations",
  ];

  return (
    <div className="overflow-x-hidden bg-light min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="w-full pt-24 pb-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-dark mb-6">
              Documentation
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Complete guide for developers and users. Learn how to set up, use,
              and get the most out of the ABCD Tools Platform.
            </p>
          </div>
        </div>
      </section>

      {/* Visual Recording Approach */}
      <section className="w-full py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-dark mb-4">
              Visual Recording Approach
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              This platform uses visual/coordinate-based recording instead of
              traditional DOM selectors, making automation resilient to UI changes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {visualApproach.map((approach, index) => (
              <div
                key={index}
                className={`p-6 rounded-xl border-2 ${approach.color} transition-all duration-300`}
              >
                <h3 className="text-xl font-bold mb-3 text-dark">
                  {approach.title}
                </h3>
                <p className="text-gray-600 mb-4">{approach.description}</p>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{approach.code}</code>
                </pre>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 p-8 rounded-xl border-2 border-blue-200">
            <h3 className="text-2xl font-bold text-dark mb-4">
              Key Benefits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="text-2xl">✅</span>
                  <span className="text-gray-700 font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* For Developers Section */}
      <section className="w-full py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-dark mb-4">
              👨‍💻 For Developers
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Setup instructions, development commands, and recording workflows
            </p>
          </div>

          {/* Prerequisites */}
          <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-gray-200 mb-8">
            <h3 className="text-2xl font-bold text-dark mb-4">
              Prerequisites
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>
                  <strong>Node.js</strong> (v18 or higher) - Download from{" "}
                  <a
                    href="https://nodejs.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    nodejs.org
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>
                  <strong>pnpm</strong> - Install globally:{" "}
                  <code className="bg-gray-100 px-2 py-1 rounded">
                    npm install -g pnpm
                  </code>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>
                  <strong>Supabase</strong> - Set up a Supabase project and
                  configure environment variables
                </span>
              </li>
            </ul>
          </div>

          {/* Setup Steps */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-dark mb-6">
              Installation & Setup
            </h3>
            <div className="space-y-6">
              {developerSteps.map((item, index) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-xl shadow-md border-2 border-gray-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                      {item.step}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-dark mb-2">
                        {item.title}
                      </h4>
                      <p className="text-gray-600 mb-3">{item.description}</p>
                      <pre className="bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto text-sm">
                        <code>{item.code}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Development Commands */}
          <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-gray-200 mb-8">
            <h3 className="text-2xl font-bold text-dark mb-6">
              Development Commands
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {devCommands.map((cmd, index) => (
                <div
                  key={index}
                  className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                >
                  <code className="text-blue-600 font-mono font-semibold text-lg block mb-2">
                    {cmd.command}
                  </code>
                  <p className="text-gray-600 text-sm">{cmd.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recording Workflows */}
          <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-blue-200">
            <h3 className="text-2xl font-bold text-dark mb-4">
              Recording Workflows
            </h3>
            <p className="text-gray-600 mb-4">
              Use the visual recording tool to capture browser interactions:
            </p>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg mb-4 overflow-x-auto">
              <pre className="text-sm">
                <code>{`$ pnpm record

🎬 Micro-Actions Recorder
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Platform (instagram/facebook/twitter): instagram
Starting URL: https://instagram.com
Session name (optional): 

📱 Opening browser in mobile mode...
🎬 Recording overlay will show status in top-right corner

[Browser opens - perform your actions]
[Press Ctrl+C when done]

✅ Recording saved to recordings/instagram_2025-12-07T16-10-38-757Z.json`}</code>
              </pre>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-dark mb-2">Recording Tips:</h4>
              <ul className="space-y-1 text-gray-700 text-sm">
                <li>• Wait for page load before interacting</li>
                <li>• Use stable elements (buttons, form fields)</li>
                <li>• The recorder captures surrounding text automatically</li>
                <li>• Press Ctrl+C in terminal when finished</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* For Users Section */}
      <section className="w-full py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-dark mb-4">
              👥 For Users
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Step-by-step guide to get started with the platform
            </p>
          </div>

          {/* User Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
            {userSteps.map((item, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border-2 border-blue-100"
              >
                <div className="text-4xl mb-3">{item.icon}</div>
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm mb-3">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold text-dark mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          {/* Detailed Instructions */}
          <div className="space-y-8">
            {/* Create Account */}
            <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-gray-200">
              <h3 className="text-2xl font-bold text-dark mb-4">
                1. Create an Account
              </h3>
              <ol className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">1.</span>
                  <span>
                    Visit the website and click <strong>"Register"</strong> or
                    navigate to <code className="bg-gray-100 px-2 py-1 rounded">/register</code>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">2.</span>
                  <span>
                    Enter your email and password (minimum 8 characters)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">3.</span>
                  <span>Accept the Terms and Policy</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">4.</span>
                  <span>Click <strong>"Register"</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">5.</span>
                  <span>Check your email to verify your account</span>
                </li>
              </ol>
            </div>

            {/* Install Agent */}
            <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-gray-200">
              <h3 className="text-2xl font-bold text-dark mb-4">
                2. Install the Agent
              </h3>
              <p className="text-gray-600 mb-4">
                The agent is a lightweight application that runs on your local
                machine to process your posts securely.
              </p>
              <ol className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">1.</span>
                  <span>
                    <strong>Login</strong> to your account
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">2.</span>
                  <span>
                    Navigate to <strong>"Clients"</strong> in the dashboard
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">3.</span>
                  <span>
                    Click <strong>"Download Client"</strong> to get the agent
                    installer
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">4.</span>
                  <span>Run the installer on your computer</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">5.</span>
                  <span>
                    The agent will appear in your <strong>Clients</strong> list
                    with status "Offline" initially
                  </span>
                </li>
              </ol>
            </div>

            {/* Add Accounts */}
            <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-gray-200">
              <h3 className="text-2xl font-bold text-dark mb-4">
                3. Add Social Media Accounts
              </h3>
              <ol className="space-y-3 text-gray-700 mb-4">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">1.</span>
                  <span>
                    Go to <strong>"Accounts"</strong> in the dashboard
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">2.</span>
                  <span>Click <strong>"Add Account"</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">3.</span>
                  <span>Select:</span>
                </li>
              </ol>
              <ul className="ml-8 space-y-2 text-gray-700 mb-4">
                <li>• <strong>Platform</strong>: Instagram, Facebook, or Twitter</li>
                <li>• <strong>Client</strong>: Choose the client/agent you installed</li>
                <li>• <strong>Username</strong>: Your social media username</li>
                <li>• <strong>Password</strong>: Your social media password</li>
              </ul>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Free tier allows up to 3 accounts.
                  Upgrade for unlimited accounts.
                </p>
              </div>
            </div>

            {/* Create Posts */}
            <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-gray-200">
              <h3 className="text-2xl font-bold text-dark mb-4">
                4. Create and Queue Posts
              </h3>
              <ol className="space-y-3 text-gray-700 mb-4">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">1.</span>
                  <span>
                    Navigate to <strong>"Create Post"</strong> or{" "}
                    <strong>"Posts"</strong> → <strong>"Create"</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">2.</span>
                  <span>
                    <strong>Upload an image</strong>:
                    <ul className="ml-4 mt-2 space-y-1 text-sm">
                      <li>• Supported formats: JPG, PNG, WEBP</li>
                      <li>• Maximum size: 10MB</li>
                    </ul>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">3.</span>
                  <span>
                    <strong>Write your caption</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">4.</span>
                  <span>
                    <strong>Select target accounts</strong>: Choose which
                    accounts to post to
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">5.</span>
                  <span>
                    <strong>Schedule (optional)</strong>: Set a date/time for
                    future posting, or leave empty for immediate queue
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">6.</span>
                  <span>Click <strong>"Create Post"</strong></span>
                </li>
              </ol>
              <p className="text-gray-600 text-sm">
                The post will be added to your queue and processed when you wake
                up your agent.
              </p>
            </div>

            {/* Wake Agent */}
            <div className="bg-white p-8 rounded-xl shadow-lg border-2 border-gray-200">
              <h3 className="text-2xl font-bold text-dark mb-4">
                5. Wake Up Your Agent
              </h3>
              <ol className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">1.</span>
                  <span>
                    Go to <strong>"Clients"</strong> in the dashboard
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">2.</span>
                  <span>Find your installed client</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">3.</span>
                  <span>Click <strong>"Wake Up"</strong> button</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">4.</span>
                  <span>
                    The agent will process all queued posts automatically
                  </span>
                </li>
              </ol>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded mt-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> The agent must be running on your
                  machine for posts to be processed.
                </p>
              </div>
            </div>
          </div>

          {/* Features Overview */}
          <div className="mt-12 bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 rounded-xl">
            <h3 className="text-2xl font-bold mb-6">Platform Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">📱 Multi-Platform Posting</h4>
                <p className="text-blue-100 text-sm">
                  Post to Instagram, Facebook, and Twitter simultaneously
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">⏰ Queue & Schedule</h4>
                <p className="text-blue-100 text-sm">
                  Create posts in advance and process on-demand
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">📊 Post History</h4>
                <p className="text-blue-100 text-sm">
                  Track all posts with detailed job status
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🔒 Security</h4>
                <p className="text-blue-100 text-sm">
                  Client-side encryption and local processing
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-dark mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 text-gray-600">
            Join thousands of users automating their social media workflow
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-dark text-white font-semibold rounded-lg shadow-lg hover:bg-dark/90 transition-all duration-300 transform hover:scale-105"
            >
              Create Free Account
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-white border-2 border-dark text-dark font-semibold rounded-lg hover:bg-gray-50 transition-all duration-300"
            >
              Login to Dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Docs;
