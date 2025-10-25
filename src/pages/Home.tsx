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
  Menu
} from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Questions",
      description: "Generate intelligent questions tailored to your curriculum with advanced AI"
    },
    {
      icon: BookOpen,
      title: "Smart Question Bank",
      description: "Organize and manage thousands of questions with powerful search and tagging"
    },
    {
      icon: Users,
      title: "Multi-Role Support",
      description: "Parents, students, and admins - everyone gets the perfect experience"
    },
    {
      icon: Shield,
      title: "Secure Testing",
      description: "Advanced proctoring and security features ensure exam integrity"
    },
    {
      icon: TrendingUp,
      title: "Performance Analytics",
      description: "Deep insights into student performance and progress tracking"
    },
    {
      icon: Zap,
      title: "Instant Results",
      description: "Automated grading and comprehensive result analysis in real-time"
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Navigation */}
      <nav className="border-b border-border/40 sticky top-0 z-50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-2">
              <GraduationCap className="w-7 h-7 text-primary" />
              <span className="text-2xl font-bold text-foreground">
                mQuiz
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/auth')}
                className="hidden md:inline-flex"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => navigate('/auth')}
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
              >
                Get Started
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-16 sm:py-24 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary animate-fade-in">
              <Sparkles className="w-4 h-4 animate-pulse" />
              The Future of Educational Testing
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-foreground tracking-tight animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Transform Your
              <span className="block text-primary mt-2">
                Teaching & Testing
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.4s' }}>
              Create, manage, and analyze tests with AI-powered intelligence. 
              The complete platform for modern education.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <Button 
                size="lg"
                onClick={() => navigate('/auth')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 text-base h-12 px-8 group"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => navigate('/auth')}
                className="text-base h-12 px-8 border-2"
              >
                Watch Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-3xl mx-auto pt-16 animate-fade-in" style={{ animationDelay: '0.8s' }}>
              {[
                { value: "10K+", label: "Questions Generated" },
                { value: "500+", label: "Active Users" },
                { value: "99.9%", label: "Uptime" }
              ].map((stat, i) => (
                <div key={i} className="space-y-2 hover:scale-110 transition-transform duration-300">
                  <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed for educators, students, and administrators
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, i) => (
              <Card 
                key={i}
                className="border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 group bg-card animate-fade-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <CardContent className="pt-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                    <feature.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border-2 shadow-2xl bg-card overflow-hidden animate-fade-in hover:shadow-primary/10 transition-all duration-500">
            <CardContent className="p-8 sm:p-12 lg:p-16">
              <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
                <div>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                    Why Choose mQuiz?
                  </h2>
                  <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                    Join thousands of educators who are already transforming their teaching experience
                  </p>
                  <Button 
                    size="lg"
                    onClick={() => navigate('/auth')}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 h-12"
                  >
                    Get Started Now
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-4">
                  {benefits.map((benefit, i) => (
                    <div 
                      key={i} 
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 hover:translate-x-2 transition-all duration-300 animate-fade-in"
                      style={{ animationDelay: `${i * 0.1 + 0.2}s` }}
                    >
                      <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5 animate-scale-in" style={{ animationDelay: `${i * 0.1 + 0.3}s` }} />
                      <span className="text-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-8 sm:p-12 lg:p-16 shadow-2xl animate-fade-in hover:shadow-primary/30 hover:scale-[1.02] transition-all duration-500">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-bounce">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
              Join the future of educational testing. Start creating professional tests in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => navigate('/auth')}
                className="bg-white text-primary hover:bg-white/90 shadow-xl h-12 px-8 font-semibold"
              >
                Start Free Trial
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => navigate('/auth')}
                className="border-2 border-white text-white hover:bg-white/10 h-12 px-8 font-semibold"
              >
                Contact Sales
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 hover:scale-110 transition-transform duration-300">
              <GraduationCap className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold text-foreground">mQuiz</span>
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