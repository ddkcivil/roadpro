import React, { useState } from 'react';
import {
  HardHat,
  Mail,
  Phone,
  MapPin,
  Globe,
  Twitter,
  Facebook,
  Linkedin,
  Instagram
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';

const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you would send the form data to a backend
    alert('Thank you for your message! We will get back to you soon.');
    setFormData({
      name: '',
      email: '',
      subject: '',
      message: ''
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary rounded-xl flex items-center justify-center text-white">
            <HardHat size={28} />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight">Contact Us</h1>
            <h2 className="text-xl text-muted-foreground mt-1">Get in touch with our team</h2>
          </div>
        </div>
        <p className="text-muted-foreground max-w-3xl">
          Have questions about RoadMaster.Pro? Interested in learning more about our platform?
          Reach out to us using any of the channels below, and our team will get back to you promptly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Send us a message</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                Send Message
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground mt-1">
                  <MapPin size={18} />
                </div>
                <div>
                  <h3 className="font-semibold">Address</h3>
                  <p className="text-sm text-muted-foreground">
                    Global Platform<br />
                    Connecting Teams Worldwide
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground mt-1">
                  <Phone size={18} />
                </div>
                <div>
                  <h3 className="font-semibold">Phone</h3>
                  <p className="text-sm text-muted-foreground">
                    For support inquiries:<br />
                    <a href="tel:+1234567890" className="text-primary hover:underline">+1 (234) 567-8900</a>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground mt-1">
                  <Mail size={18} />
                </div>
                <div>
                  <h3 className="font-semibold">Email</h3>
                  <p className="text-sm text-muted-foreground">
                    General inquiries:<br />
                    <a href="mailto:info@roadmasterpro.com" className="text-primary hover:underline">info@roadmasterpro.com</a><br />
                    Support:<br />
                    <a href="mailto:support@roadmasterpro.com" className="text-primary hover:underline">support@roadmasterpro.com</a>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground mt-1">
                  <Globe size={18} />
                </div>
                <div>
                  <h3 className="font-semibold">Website</h3>
                  <p className="text-sm text-muted-foreground">
                    <a href="https://www.roadmasterpro.com" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                      www.roadmasterpro.com
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Follow Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Stay connected with us on social media for updates and news.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" size="icon" asChild>
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    <Twitter size={18} />
                  </a>
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    <Facebook size={18} />
                  </a>
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    <Linkedin size={18} />
                  </a>
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    <Instagram size={18} />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Office Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-primary mb-2">Business Hours</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Monday - Friday: 9:00 AM - 6:00 PM EST</p>
                <p>Saturday: 10:00 AM - 2:00 PM EST</p>
                <p>Sunday: Closed</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-primary mb-2">Support Availability</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>24/7 Online Support</p>
                <p>Phone Support: Business Hours</p>
                <p>Email Response: Within 24 hours</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactPage;
