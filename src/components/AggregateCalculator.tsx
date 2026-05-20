
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Plus, Minus } from 'lucide-react';

interface Subject {
  id: number;
  name: string;
  grade: string;
  points: number;
}

const AggregateCalculator = () => {
  const [subjects, setSubjects] = useState<Subject[]>([
    { id: 1, name: '', grade: '', points: 0 }
  ]);
  const [totalAggregate, setTotalAggregate] = useState(0);

  const gradePoints: { [key: string]: number } = {
    'A1': 1,
    'B2': 2,
    'B3': 3,
    'C4': 4,
    'C5': 5,
    'C6': 6,
    'D7': 7,
    'E8': 8,
    'F9': 9
  };

  const addSubject = () => {
    const newId = Math.max(...subjects.map(s => s.id)) + 1;
    setSubjects([...subjects, { id: newId, name: '', grade: '', points: 0 }]);
  };

  const removeSubject = (id: number) => {
    if (subjects.length > 1) {
      setSubjects(subjects.filter(s => s.id !== id));
    }
  };

  const updateSubject = (id: number, field: keyof Subject, value: string) => {
    setSubjects(subjects.map(subject => {
      if (subject.id === id) {
        const updated = { ...subject, [field]: value };
        if (field === 'grade') {
          updated.points = gradePoints[value] || 0;
        }
        return updated;
      }
      return subject;
    }));
  };

  const calculateAggregate = () => {
    const total = subjects.reduce((sum, subject) => sum + subject.points, 0);
    setTotalAggregate(total);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5" />
        <h3 className="font-medium">Aggregate Calculator</h3>
      </div>

      <div className="space-y-3">
        {subjects.map((subject, index) => (
          <Card key={subject.id} className="p-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Subject {index + 1}</Label>
                {subjects.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSubject(subject.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    placeholder="Subject name"
                    value={subject.name}
                    onChange={(e) => updateSubject(subject.id, 'name', e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <select
                    value={subject.grade}
                    onChange={(e) => updateSubject(subject.id, 'grade', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-input bg-background rounded-md"
                  >
                    <option value="">Select Grade</option>
                    {Object.keys(gradePoints).map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {subject.grade && (
                <div className="text-xs text-gray-600">
                  Points: {subject.points}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={addSubject}
          className="flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          Add Subject
        </Button>
        
        <Button
          size="sm"
          onClick={calculateAggregate}
          className="flex items-center gap-1"
        >
          <Calculator className="h-3 w-3" />
          Calculate
        </Button>
      </div>

      {totalAggregate > 0 && (
        <Card className="p-4 bg-primary/5">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-lg">Total Aggregate</CardTitle>
            <CardDescription className="text-sm">
              Based on {subjects.filter(s => s.grade).length} subjects
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold text-primary">
              {totalAggregate}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AggregateCalculator;
