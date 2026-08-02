import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  BookOpen, 
  Brain, 
  Users, 
  Shield, 
  Sparkles, 
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Zap,
  GraduationCap,
  Menu,
  Play
} from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Questions",
      description: "Generate intelligent questions tailored to your curriculum with advanced AI algorithms that understand context and nuance."
    },
    {
      icon: BookOpen,
      title: "Smart Question Bank",
      description: "Organize and manage thousands of questions with powerful search, tagging, and version control systems."
    },
    {
      icon: Users,
      title: "Multi-Role Support",
      description: "Dedicated interfaces for Teachers, Students, and Admins ensuring everyone gets the perfect experience."
    },
    {
      icon: Shield,
      title: "Secure Testing",
      description: "Advanced proctoring capabilities and secure browser environments to ensure absolute exam integrity."
    },
    {
      icon: TrendingUp,
      title: "Performance Analytics",
      description: "Deep insights into student performance with predictive analytics and progress tracking visualizations."
    },
    {
      icon: Zap,
      title: "Instant Results",
      description: "Automated grading with detailed feedback and comprehensive result analysis delivered in real-time."
    }
  ];

  const benefits = [
    "Create unlimited question papers in minutes",
    "AI-generated questions from your documents",
    "Secure online testing environment",
    "Detailed performance reports and analytics",
    "Multi-subject and multi-class support",
    "Parent-student collaboration tools"
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden selection:bg-primary/20 selection:text-primary">
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/50 dark:bg-black/50 backdrop-blur-md border-b border-white/20 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/25">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                mQuiz
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Features</a>
              <a href="#benefits" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Benefits</a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Pricing</a>
            </div>

            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/auth')}
                className="hidden md:inline-flex font-medium hover:bg-primary/5 hover:text-primary"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 rounded-full px-6 transition-all duration-300 hover:scale-105"
              >
                Get Started
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-white/10 border border-primary/20 backdrop-blur-sm shadow-sm animate-fade-in">
              <Sparkles className="w-4 h-4 text-primary fill-primary" />
              <span className="text-sm font-medium text-primary">The Future of Educational Testing</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Transform Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-primary">Teaching & Testing</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Create, manage, and analyze tests with AI-powered intelligence. 
              Experience the most advanced platform for modern education.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <Button 
                size="lg"
                onClick={() => navigate('/auth')}
                className="h-14 px-8 rounded-full bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/25 text-lg font-medium transition-all duration-300 hover:scale-105 hover:-translate-y-1"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => navigate('/auth')}
                className="h-14 px-8 rounded-full border-2 border-primary/10 bg-white/50 hover:bg-white/80 hover:border-primary/30 text-lg font-medium backdrop-blur-sm transition-all duration-300"
              >
                <Play className="mr-2 w-5 h-5 fill-current" />
                Watch Demo
              </Button>
            </div>

            {/* Hero Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto pt-20 animate-fade-in" style={{ animationDelay: '0.5s' }}>
              {[
                { value: "10K+", label: "Questions Generated" },
                { value: "500+", label: "Active Users" },
                { value: "99.9%", label: "Uptime" }
              ].map((stat, i) => (
                <div key={i} className="glass p-6 rounded-2xl text-center hover:scale-105 transition-transform duration-300">
                  <div className="text-3xl sm:text-4xl font-bold text-primary mb-1">{stat.value}</div>
                  <div className="text-sm font-medium text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed for educators, students, and administrators to streamline the entire testing process.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div 
                key={i}
                className="glass-card p-8 rounded-3xl group hover:-translate-y-2"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-7 h-7 text-primary group-hover:text-purple-600 transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass rounded-[2.5rem] p-8 sm:p-12 lg:p-16 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-primary opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            
            <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
              <div className="space-y-8">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
                  Why Choose <span className="text-primary">mQuiz</span>?
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Join thousands of educators who are already transforming their teaching experience with our state-of-the-art platform.
                </p>
                <Button 
                  size="lg"
                  onClick={() => navigate('/auth')}
                  className="h-12 px-8 rounded-full bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary/90"
                >
                  Get Started Now
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid gap-4">
                {benefits.map((benefit, i) => (
                  <div 
                    key={i} 
                    className="flex items-center gap-4 p-4 rounded-xl bg-white/50 dark:bg-black/20 border border-white/20 hover:bg-white/80 transition-colors duration-300"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <span className="font-medium text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-[3rem] overflow-hidden p-12 sm:p-20 text-center">
            <div className="absolute inset-0 bg-gradient-primary" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            
            <div className="relative z-10 space-y-8">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-8 animate-float">
                <GraduationCap className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
                Ready to Get Started?
              </h2>
              
              <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
                Join the future of educational testing today. Start creating professional tests in minutes.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button 
                  size="lg"
                  onClick={() => navigate('/auth')}
                  className="h-14 px-10 rounded-full bg-white text-primary hover:bg-white/90 shadow-xl font-semibold text-lg"
                >
                  Start Free Trial
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => navigate('/auth')}
                  className="h-14 px-10 rounded-full border-2 border-white/20 bg-white/10 text-white hover:bg-white/20 font-semibold text-lg backdrop-blur-sm"
                >
                  Contact Sales
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">mQuiz</span>
            </div>
            
            <div className="flex gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-primary transition-colors">Contact</a>
            </div>
            
            <p className="text-sm text-muted-foreground">
              © 2025 mQuiz. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;