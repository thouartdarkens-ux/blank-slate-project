import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Download, FileText, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Spinner } from '@/components/ui/spinner';
import Papa from 'papaparse';

interface UniversityData {
  id: string;
  university: string;
  Faculty: string;
  programme: string;
  cutoff_point: number;
  requirements: string;
  created_at: string;
}

const UniversityDataPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [universityData, setUniversityData] = useState<UniversityData[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchUniversityData = async () => {
    setLoading(true);
    try {
      console.log('Fetching university data...');
      const response = await fetch('https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/add-university-data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('Full API response:', result);
        console.log('Data array:', result.data);
        console.log('Data length:', result.data?.length);
        
        if (result.data && Array.isArray(result.data)) {
          setUniversityData(result.data);
          console.log('Set university data with', result.data.length, 'records');
        } else {
          console.error('Data is not in expected format:', result);
          setUniversityData([]);
        }
      } else {
        throw new Error(`HTTP ${response.status}: Failed to fetch university data`);
      }
    } catch (error) {
      console.error('Error fetching university data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch university data.",
        variant: "destructive",
      });
      setUniversityData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUniversityData();
  }, []);

  const downloadExampleCSV = () => {
    const exampleData = [
      {
        university: "University of Ghana",
        Faculty: "Faculty of Science",
        programme: "Computer Science",
        cutoff_point: 85.5,
        requirements: "Mathematics, Physics, Chemistry"
      },
      {
        university: "KNUST",
        Faculty: "Faculty of Engineering",
        programme: "Civil Engineering", 
        cutoff_point: 82.0,
        requirements: "Mathematics, Physics, Chemistry"
      },
      {
        university: "University of Cape Coast",
        Faculty: "Faculty of Arts",
        programme: "English Language",
        cutoff_point: 75.5,
        requirements: "English Language, Literature, History"
      }
    ];

    const csv = Papa.unparse(exampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'university_data_example.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    toast({
      title: "Example CSV Downloaded",
      description: "Use this format for your university data upload.",
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      toast({
        title: "Invalid File Type",
        description: "Please select a CSV file.",
        variant: "destructive",
      });
    }
  };

  const uploadCSV = async () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to upload.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Parse CSV file
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          console.log('Parsed CSV data:', results.data);
          
          // Process each row and send to API
          for (const row of results.data as any[]) {
            if (row.university && row.Faculty && row.programme) {
              try {
                // Create query parameters
                const params = new URLSearchParams({
                  university: row.university || "",
                  Faculty: row.Faculty || "",
                  programme: row.programme || "", 
                  cutoff_point: row.cutoff_point || "0",
                  requirements: row.requirements || ""
                });

                const response = await fetch(`https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/add-university-data?${params.toString()}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  }
                });

                const result = await response.json();
                console.log('Upload result:', result);
              } catch (error) {
                console.error('Error uploading row:', error);
              }
            }
          }

          toast({
            title: "Upload Complete",
            description: `Successfully processed ${results.data.length} records.`,
          });
          
          setFile(null);
          // Reset file input
          const fileInput = document.getElementById('csv-file') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
          
          // Refresh the data table
          fetchUniversityData();
        },
        error: (error) => {
          console.error('CSV parsing error:', error);
          toast({
            title: "Upload Failed",
            description: "Error parsing CSV file. Please check the format.",
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "An error occurred while uploading the file.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  console.log('Current universityData state:', universityData);
  console.log('universityData length:', universityData.length);

  return (
    <MainLayout title="University Data">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">University Data Management</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Download Example CSV */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Download Example CSV
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Download an example CSV file to see the required format for university data upload.
              </p>
              <Button onClick={downloadExampleCSV} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Example CSV
              </Button>
            </CardContent>
          </Card>

          {/* Upload CSV */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload University Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csv-file">Select CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                  disabled={uploading}
                />
              </div>
              
              {file && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{file.name}</span>
                </div>
              )}

              <Button 
                onClick={uploadCSV} 
                disabled={!file || uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Spinner className="mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CSV
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* University Data Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>University Data ({universityData.length} records)</CardTitle>
              <Button
                onClick={fetchUniversityData}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 w-full rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>University</TableHead>
                    <TableHead>Faculty</TableHead>
                    <TableHead>Programme</TableHead>
                    <TableHead>Cutoff Point</TableHead>
                    <TableHead>Requirements</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {universityData.length > 0 ? (
                    universityData.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.university}</TableCell>
                        <TableCell>{row.Faculty}</TableCell>
                        <TableCell>{row.programme}</TableCell>
                        <TableCell>{row.cutoff_point}</TableCell>
                        <TableCell>{row.requirements || '-'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        {loading ? "Loading..." : "No university data found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>CSV Format Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-muted-foreground">Your CSV file should contain the following columns:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>university</strong> - Name of the university</li>
                <li><strong>Faculty</strong> - Faculty name</li>
                <li><strong>programme</strong> - Programme/course name</li>
                <li><strong>cutoff_point</strong> - Cutoff point (numerical value)</li>
                <li><strong>requirements</strong> - Course requirements</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default UniversityDataPage;
