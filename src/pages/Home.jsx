import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronRight, Eye, Shield, Video } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLastCamera } from "@/lib/storage";

export default function Home() {
  const navigate = useNavigate();
  const [lastCamera] = useState(() => getLastCamera());

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
      <header className="px-6 py-10 sm:px-10 sm:py-14">
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-600 mb-6">
            <Shield className="w-3.5 h-3.5" />
            Personal Security Monitor
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 leading-tight">
            Turn a phone into a live security camera.
          </h1>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl leading-relaxed">
            Leave one phone at home as the camera. Watch from the phone you carry — split screen,
            listen with EQ, record video or audio on this phone. No Base44 account or paid plan.
          </p>
        </div>
      </header>

      <main className="flex-1 px-6 pb-16 sm:px-10">
        <div className="max-w-5xl mx-auto">
          {lastCamera && (
            <button
              onClick={() => navigate(`/viewer?quick=1&code=${encodeURIComponent(lastCamera)}`)}
              className="text-left group focus:outline-none w-full mb-6"
            >
              <Card className="transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 border-slate-900 bg-slate-900 text-white overflow-hidden">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg text-white">View last camera</CardTitle>
                    <p className="text-sm text-white/60 mt-0.5">
                      One tap — connects to {lastCamera}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/40 group-hover:translate-x-1 transition-transform" />
                </CardContent>
              </Card>
            </button>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            <button
              onClick={() => navigate("/broadcaster")}
              className="text-left group focus:outline-none"
            >
              <Card className="h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-slate-200 bg-white overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center mb-4">
                    <Video className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-2xl">Use as Camera</CardTitle>
                  <CardDescription className="text-base text-slate-500">
                    This device streams its camera and microphone.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Open this on the phone you leave at home, plugged in, with this tab kept open. It
                    streams live video and audio and shows a short code.
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-900 group-hover:gap-3 transition-all">
                    <ArrowRight className="w-4 h-4" />
                    Start broadcasting
                  </div>
                </CardContent>
              </Card>
            </button>

            <button onClick={() => navigate("/viewer")} className="text-left group focus:outline-none">
              <Card className="h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-slate-200 bg-white overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4 border border-slate-200">
                    <Eye className="w-6 h-6 text-slate-900" />
                  </div>
                  <CardTitle className="text-2xl">View a Camera</CardTitle>
                  <CardDescription className="text-base text-slate-500">
                    Watch and listen to a remote device's live feed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Open this on the phone you take with you. Enter a code, add more cameras for
                    split screen, record on this phone, and hold Talk to speak through the house.
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-900 group-hover:gap-3 transition-all">
                    <Eye className="w-4 h-4" />
                    Connect to a camera
                  </div>
                </CardContent>
              </Card>
            </button>
          </div>
        </div>
      </main>

      <footer className="px-6 py-8 sm:px-10 border-t border-slate-200/60">
        <div className="max-w-5xl mx-auto text-center text-xs text-slate-400">
          Bookmark this site on both phones. Keep the home phone awake and charging while you are out.
        </div>
      </footer>
    </div>
  );
}
