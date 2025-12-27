import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getUserFeedback, type Feedback } from '@/services/feedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Bug, Star, Lightbulb, Plus, ArrowLeft } from 'lucide-react';

const typeIcons = {
  feedback: MessageSquare,
  issue: Bug,
  review: Star,
  feature: Lightbulb,
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const loadFeedbacks = async () => {
      if (!user) return;
      try {
        const data = await getUserFeedback(user.uid);
        setFeedbacks(data);
      } catch (error) {
        console.error('Failed to load feedbacks:', error);
      } finally {
        setLoading(false);
      }
    };
    loadFeedbacks();
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="py-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to home
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {user.email}</p>
          </div>
          <Button asChild>
            <Link to="/feedback">
              <Plus className="h-4 w-4 mr-2" />
              New Feedback
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Submissions</CardTitle>
            <CardDescription>View your feedback, issues, and reviews.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No submissions yet</p>
                <Button asChild>
                  <Link to="/feedback">Submit your first feedback</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {feedbacks.map((feedback) => {
                  const Icon = typeIcons[feedback.type];
                  return (
                    <div
                      key={feedback.id}
                      className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{feedback.title}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary capitalize">
                            {feedback.type}
                          </span>
                          {feedback.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                              <span className="text-xs">{feedback.rating}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {feedback.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {feedback.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
