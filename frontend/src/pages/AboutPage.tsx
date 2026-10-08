import {
  Info,
  Target,
  Brain,
  Activity,
  Cpu,
  Server,
  Monitor,
  Wifi,
  Zap,
  Thermometer,
  Gauge,
  GitBranch,
  Layers,
  Database,
  Code2,
} from 'lucide-react';
import Card from '@/components/ui/Card';

export default function AboutPage() {
  return (
    <div className="space-y-5">
      {/* Hero section */}
      <div className="card p-8 animate-slide-up relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/10 border border-primary-500/20">
              <Info size={24} className="text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">About the Project</h2>
              <p className="text-sm text-slate-500">Final Year Engineering Project — 2026</p>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-100 leading-tight">
            AI-Based Intelligent
            <span className="text-primary-400"> EV Battery Health Monitoring System</span>
          </h3>
          <p className="mt-4 max-w-3xl text-sm text-slate-400 leading-relaxed">
            A comprehensive battery monitoring and health prediction system for electric
            vehicles. The system uses machine learning to predict the State of Health (SOH)
            and Remaining Useful Life (RUL) of EV batteries by analyzing real-time sensor data
            including voltage, current, and temperature. Built as a final-year engineering
            project to demonstrate the integration of IoT sensors, embedded systems, backend
            APIs, and modern web technologies.
          </p>
        </div>
      </div>

      {/* Purpose */}
      <Card
        title="Project Purpose"
        subtitle="Why this system matters"
        icon={<Target size={16} />}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400 leading-relaxed">
            Electric vehicle batteries degrade over time due to charge-discharge cycles,
            temperature stress, and usage patterns. Traditional battery management systems
            only monitor basic parameters — they don't predict future health. This project
            bridges that gap by applying AI/ML to historical battery data, enabling proactive
            maintenance and preventing unexpected battery failures.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { title: 'Predictive Maintenance', desc: 'Forecast battery degradation before it becomes critical' },
              { title: 'Real-time Safety', desc: 'Continuous monitoring of voltage, current, and temperature' },
              { title: 'Cost Optimization', desc: 'Extend battery lifespan through informed usage patterns' },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-base-700/50 bg-base-800/50 p-4">
                <h4 className="text-sm font-semibold text-slate-200 mb-1">{item.title}</h4>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* System Architecture */}
      <Card
        title="System Architecture"
        subtitle="End-to-end data flow from sensor to dashboard"
        icon={<Layers size={16} />}
        noPadding
      >
        <div className="p-6">
          {/* Flow diagram */}
          <div className="flex flex-col lg:flex-row items-stretch gap-3">
            {[
              { icon: Cpu, label: 'ESP32 + Sensors', desc: 'Data acquisition', color: 'text-primary-400', bg: 'bg-primary-500/10' },
              { icon: Wifi, label: 'Data Transmission', desc: 'WiFi / MQTT', color: 'text-accent-400', bg: 'bg-accent-500/10' },
              { icon: Server, label: 'Flask Backend', desc: 'API + ML model', color: 'text-warning-400', bg: 'bg-warning-500/10' },
              { icon: Monitor, label: 'React Dashboard', desc: 'Visualization', color: 'text-success-400', bg: 'bg-success-500/10' },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex items-center gap-3 lg:flex-1">
                  <div className={`flex-1 rounded-xl border border-base-700/50 p-4 ${step.bg}`}>
                    <Icon size={24} className={step.color} />
                    <p className="mt-2 text-sm font-semibold text-slate-200">{step.label}</p>
                    <p className="text-xs text-slate-500">{step.desc}</p>
                  </div>
                  {i < 3 && (
                    <div className="hidden lg:flex text-slate-600 text-xl">→</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Component breakdown */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* AI/ML SOH Prediction */}
        <Card
          title="AI/ML-Based SOH Prediction"
          subtitle="Machine learning for battery health forecasting"
          icon={<Brain size={16} />}
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-400 leading-relaxed">
              The system uses machine learning models trained on historical battery cycling
              data to predict the State of Health (SOH) — a metric representing the battery's
              current capacity relative to its original capacity.
            </p>
            <div className="space-y-2">
              {[
                { label: 'Input Features', value: 'Voltage, Current, Temperature, Cycle Count, Capacity' },
                { label: 'ML Model', value: 'Regression-based prediction (teammate implementation)' },
                { label: 'Outputs', value: 'Predicted SOH (%), Remaining Useful Life (cycles)' },
                { label: 'Backend', value: 'Python / Flask REST API' },
              ].map((item) => (
                <div key={item.label} className="flex flex-col sm:flex-row gap-1 sm:gap-3 rounded-lg bg-base-800/50 p-3">
                  <span className="text-xs font-semibold text-slate-400 sm:w-32 flex-shrink-0">{item.label}</span>
                  <span className="text-xs text-slate-300">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Battery Monitoring & Sensors */}
        <Card
          title="Battery Monitoring & Sensors"
          subtitle="Hardware data acquisition layer"
          icon={<Activity size={16} />}
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-400 leading-relaxed">
              Physical sensors connected to the battery pack measure key electrical and
              thermal parameters in real-time. The ESP32 microcontroller reads these sensors
              and transmits data to the backend.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { icon: Zap, label: 'Voltage Sensor', desc: 'Cell voltage measurement (0–5V range)' },
                { icon: Activity, label: 'Current Sensor', desc: 'Charge/discharge current (ACS712 or similar)' },
                { icon: Thermometer, label: 'Temperature Sensor', desc: 'DS18B20 / thermistor for thermal monitoring' },
                { icon: Gauge, label: 'Capacity Tracking', desc: 'Coulomb counting for capacity estimation' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-2.5 rounded-lg bg-base-800/50 p-3">
                    <Icon size={16} className="text-primary-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{item.label}</p>
                      <p className="text-[11px] text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* ESP32 */}
        <Card
          title="ESP32 Microcontroller"
          subtitle="Embedded system for data acquisition"
          icon={<Cpu size={16} />}
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-400 leading-relaxed">
              The ESP32 is the central embedded controller. It reads analog and digital
              sensor data, performs initial processing, and sends readings to the Flask
              backend over WiFi.
            </p>
            <div className="space-y-2">
              {[
                { label: 'Microcontroller', value: 'ESP32 (dual-core, WiFi + BLE)' },
                { label: 'ADC', value: '12-bit ADC for analog sensor readings' },
                { label: 'Communication', value: 'WiFi (HTTP/MQTT to Flask backend)' },
                { label: 'Sampling Rate', value: 'Configurable (e.g., every 2 seconds for live mode)' },
              ].map((item) => (
                <div key={item.label} className="flex flex-col sm:flex-row gap-1 sm:gap-3 rounded-lg bg-base-800/50 p-3">
                  <span className="text-xs font-semibold text-slate-400 sm:w-32 flex-shrink-0">{item.label}</span>
                  <span className="text-xs text-slate-300">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Backend */}
        <Card
          title="Backend (Flask / Python)"
          subtitle="API server and ML model hosting"
          icon={<Server size={16} />}
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-400 leading-relaxed">
              The Flask backend serves as the bridge between the hardware and the frontend.
              It receives sensor data from the ESP32, stores it, runs the ML model for SOH/RUL
              prediction, and exposes REST API endpoints for the dashboard to consume.
            </p>
            <div className="space-y-2">
              {[
                { label: 'Framework', value: 'Flask (Python REST API)' },
                { label: 'ML Integration', value: 'scikit-learn / TensorFlow for SOH prediction' },
                { label: 'Data Storage', value: 'Database for historical battery readings' },
                { label: 'API Format', value: 'JSON responses matching the dashboard data structure' },
              ].map((item) => (
                <div key={item.label} className="flex flex-col sm:flex-row gap-1 sm:gap-3 rounded-lg bg-base-800/50 p-3">
                  <span className="text-xs font-semibold text-slate-400 sm:w-32 flex-shrink-0">{item.label}</span>
                  <span className="text-xs text-slate-300">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Frontend */}
        <Card
          title="Frontend (React Dashboard)"
          subtitle="This application"
          icon={<Monitor size={16} />}
          className="lg:col-span-2"
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-400 leading-relaxed">
              The frontend is a modern React web application that visualizes battery data
              in real-time. It communicates with the Flask backend through a service layer
              that is designed to be easily swapped from mock data to live API calls.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Code2, label: 'React + Vite', desc: 'Component-based UI' },
                { icon: Layers, label: 'Tailwind CSS', desc: 'Responsive dark theme' },
                { icon: GitBranch, label: 'Recharts', desc: 'Interactive data visualization' },
                { icon: Database, label: 'Service Layer', desc: 'Modular API integration' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-xl border border-base-700/50 bg-base-800/50 p-4">
                    <Icon size={18} className="text-primary-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-200">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Data Structure */}
      <Card
        title="Backend Data Structure"
        subtitle="JSON schema returned by the Flask API"
        icon={<Database size={16} />}
      >
        <p className="text-sm text-slate-400 mb-4">
          The backend provides battery readings in the following format. The frontend is
          structured to consume this schema directly — simply replace the mock service layer
          with real API calls.
        </p>
        <div className="rounded-xl border border-base-700 bg-base-900/80 p-5 font-mono text-sm overflow-x-auto">
          <pre className="text-slate-300">{`{
  "battery_id":  "BAT-001",
  "cycle":       425,
  "voltage":     3.712,
  "current":     15.34,
  "temperature": 28.5,
  "capacity":    42.18,
  "soh":         85.2,
  "rul":         120,
  "predicted_soh": 84.8,
  "timestamp":   "2026-10-01T14:30:00Z"
}`}</pre>
        </div>
      </Card>

      {/* Team / Tech Stack */}
      <div className="card p-6 animate-slide-up">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Technology Stack</h3>
        <div className="flex flex-wrap gap-2">
          {[
            'React 18', 'Vite', 'TypeScript', 'Tailwind CSS', 'Recharts',
            'Lucide Icons', 'ESP32', 'Flask', 'Python', 'scikit-learn',
            'REST API', 'JSON', 'MQTT/WiFi',
          ].map((tech) => (
            <span
              key={tech}
              className="rounded-lg border border-base-700 bg-base-800 px-3 py-1.5 text-xs font-medium text-slate-400"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
