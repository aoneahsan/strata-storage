import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { submitFeedback } from '@/services/feedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/toaster';
import { Link } from 'react-router-dom';
import { MessageSquare, Bug, Star, Lightbulb, Send, LogIn } from 'lucide-react';

type FeedbackType = 'feedback' | 'issue' | 'review' | 'feature';

const feedbackTypes = [
  { type: 'feedback' as FeedbackType, icon: MessageSquare, label: 'Feedback', desc: 'General feedback' },
  { type: 'issue' as FeedbackType, icon: Bug, label: 'Report Issue', desc: 'Report a bug' },
  { type: 'review' as FeedbackType, icon: Star, label: 'Review', desc: 'Rate the library' },
  { type: 'feature' as FeedbackType, icon: Lightbulb, label: 'Feature Request', desc: 'Suggest a feature' },
];

export default function FeedbackPage() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<FeedbackType>('feedback');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await submitFeedback({
        type: selectedType,
        title,
        description,
        rating: selectedType === 'review' ? rating : undefined,
        userId: user.uid,
        userEmail: user.email || '',
      });

      toast({
        title: 'Thank you!',
        description: 'Your feedback has been submitted.',
        variant: 'success',
      });

      setTitle('');
      setDescription('');
      setRating(5);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="py-20">
        <div className="container mx-auto px-4 max-w-lg text-center">
          <Card>
            <CardHeader>
              <LogIn className="h-12 w-12 mx-auto text-primary mb-4" />
              <CardTitle>Sign in to Submit Feedback</CardTitle>
              <CardDescription>
                Please sign in to submit feedback, report issues, or leave a review.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/login">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="py-20">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Feedback</h1>
          <p className="text-muted-foreground">
            We value your input! Help us improve Strata Storage.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submit Feedback</CardTitle>
            <CardDescription>Choose a category and share your thoughts.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Feedback Type Selection */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {feedbackTypes.map((ft) => (
                  <button
                    key={ft.type}
                    type="button"
                    onClick={() => setSelectedType(ft.type)}
                    className={`p-4 rounded-lg border text-center transition-all ${
                      selectedType === ft.type
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <ft.icon className="h-6 w-6 mx-auto mb-2" />
                    <div className="text-sm font-medium">{ft.label}</div>
                  </button>
                ))}
              </div>

              {/* Rating (for reviews) */}
              {selectedType === 'review' && (
                <div className="space-y-2">
                  <Label>Rating</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`h-8 w-8 transition-colors ${
                            star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Brief summary"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Provide details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                <Send className="h-4 w-4 mr-2" />
                {loading ? 'Submitting...' : 'Submit'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
