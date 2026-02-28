import React from 'react';
import { 
  HardHat, 
  Building2, 
  Users, 
  Calendar,
  Award,
  Globe,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { cn } from '~/lib/utils';


// NOTE: This is a refactored version of the AboutPage component.
// The original logic has been temporarily removed to facilitate the UI migration.
// It will be re-implemented in subsequent steps.

const AboutPage: React.FC = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary rounded-2xl flex items-center justify-center text-white">
            <HardHat size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              About RoadMaster<span className="text-primary">.Pro</span>
            </h1>
            <p className="text-lg text-muted-foreground mt-1">Infrastructure Management System</p>
          </div>
        </div>
        <p className="text-muted-foreground max-w-3xl">
          RoadMaster.Pro is a comprehensive construction and infrastructure management platform designed to streamline 
          project execution, enhance collaboration, and optimize resource allocation across all phases of construction projects.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground mb-6">
                To revolutionize the construction industry by providing an integrated platform that connects all stakeholders, 
                simplifies complex workflows, and delivers real-time insights for smarter decision-making.
              </p>
              
              <h2 className="text-2xl font-bold mb-4">What We Do</h2>
              <p className="text-muted-foreground mb-6">
                RoadMaster.Pro offers end-to-end project management solutions covering commercial operations, 
                partner coordination, execution tracking, quality assurance, and resource management. Our platform 
                bridges the gap between planning and execution, ensuring seamless project delivery.
              </p>
              
              <h2 className="text-2xl font-bold mb-4">Key Features</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-white">
                    <Calendar size={18} />
                  </div>
                  <p className="font-semibold text-sm">Real-time Scheduling</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-white">
                    <Building2 size={18} />
                  </div>
                  <p className="font-semibold text-sm">Project Management</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-white">
                    <Award size={18} />
                  </div>
                  <p className="font-semibold text-sm">Quality Assurance</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-white">
                    <Users size={18} />
                  </div>
                  <p className="font-semibold text-sm">Team Collaboration</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card className="h-full">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Company Info</h2>
              <div className="flex items-center gap-3 mb-6">
                <Avatar className="h-16 w-16 bg-gradient-to-br from-primary to-primary text-white">
                  <HardHat size={32} />
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold">RoadMaster</h3>
                  <p className="text-sm text-muted-foreground">Infrastructure Solutions</p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <h3 className="text-lg font-bold mb-2">Founded</h3>
              <p className="text-muted-foreground mb-6">2024</p>
              
              <Separator className="my-4" />
              
              <h3 className="text-lg font-bold mb-2">Headquarters</h3>
              <div className="flex items-center gap-2 mb-6">
                <MapPin className="h-4 w-4 text-primary" />
                <p className="text-muted-foreground">Global Platform</p>
              </div>
              
              <Separator className="my-4" />
              
              <h3 className="text-lg font-bold mb-2">Specialties</h3>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Construction</Badge>
                <Badge variant="secondary">Project Management</Badge>
                <Badge variant="secondary">Infrastructure</Badge>
                <Badge variant="secondary">Collaboration</Badge>
                <Badge variant="secondary">Analytics</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Card className="mt-8">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
          <p className="text-muted-foreground mb-6">
            To become the leading infrastructure management platform globally, connecting millions of professionals 
            and enabling the successful completion of critical construction projects worldwide. We envision a future 
            where technology eliminates inefficiencies, enhances safety, and accelerates project timelines.
          </p>
          
          <h2 className="text-2xl font-bold mb-4">Core Values</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-3 text-white">
                <Globe size={20} />
              </div>
              <h3 className="text-lg font-bold mb-1">Integrity</h3>
              <p className="text-sm text-muted-foreground">
                Honest and transparent practices in all our interactions
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-3 text-white">
                <Award size={20} />
              </div>
              <h3 className="text-lg font-bold mb-1">Excellence</h3>
              <p className="text-sm text-muted-foreground">
                Commitment to delivering superior products and services
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-3 text-white">
                <Users size={20} />
              </div>
              <h3 className="text-lg font-bold mb-1">Collaboration</h3>
              <p className="text-sm text-muted-foreground">
                Working together to achieve shared success
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AboutPage;
