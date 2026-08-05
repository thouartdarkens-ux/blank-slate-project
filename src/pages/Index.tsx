
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { MainLayout } from "@/components/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FileText, ArrowRight } from "lucide-react";

const Index = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <MainLayout title="Welcome to Voucher Management System">
      <div className="space-y-6 animate-fade-in">
        <Card>
          <CardHeader>
            <CardTitle>Voucher & Inventory Management System</CardTitle>
            <CardDescription>
              A comprehensive tool for managing vouchers, transactions, inventory, and customer communications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              This application helps businesses manage their voucher inventory, track transactions, 
              communicate with customers, and get notified about important events.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Getting Started</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Begin by exploring the dashboard to see key metrics and recent transactions.
                  </p>
                  <Button asChild>
                    <Link to="/dashboard">
                      Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Documentation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Read the comprehensive technical documentation to learn how to integrate with external services.
                  </p>
                  <Button variant="outline" asChild>
                    <a href="/docs/AppGuide.md" target="_blank" rel="noopener noreferrer">
                      <FileText className="mr-2 h-4 w-4" /> View Documentation
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <div className="bg-muted p-4 rounded-md mt-6">
              <h3 className="font-medium mb-2">Quick Navigation</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button variant="ghost" asChild className="justify-start">
                  <Link to="/transactions">Transactions</Link>
                </Button>
                <Button variant="ghost" asChild className="justify-start">
                  <Link to="/vouchers">Inventory</Link>
                </Button>
                <Button variant="ghost" asChild className="justify-start">
                  <Link to="/alerts">Alerts</Link>
                </Button>
                <Button variant="ghost" asChild className="justify-start">
                  <Link to="/bulk-messages">Bulk Messages</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Index;
