// constants/Icons.ts
import {
  Home,
  Plus,
  BarChart3,
  User,
  Settings,
  Bell,
  Flame,
  Star,
  Calendar,
  CheckCircle2,
  Target,
  TrendingUp,
  TrendingDown,
  Award,
  Zap,
  Clock,
  Edit,
  Trash2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  X,
  XCircle,
  Check,
  AlertCircle,
  Info,
  Moon,
  Sun,
  Sunrise,
  Volume2,
  VolumeX,
  Repeat,
  Users,
  Trophy,
  PlayCircle,
  PauseCircle,
  MoreVertical,
  Filter,
  Search,
  Download,
  Upload,
  Share2,
  Heart,
  Bookmark,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Mail,
  Phone,
  MapPin,
  Image,
  FileText,
  Folder,
  Maximize2,
  Minimize2,
  Lightbulb,
  RefreshCw,
  LogOut,
  LogIn,
  UserPlus,
  Activity,
  Droplet,
  Coffee,
  Book,
  Dumbbell,
  Brain,
  Smile,
  Timer,
  BellOff,
  BellRing,
  Vibrate,
  Palette,
  ShieldCheck,
  Gift,
  Crown,
  Sparkles,
  Rocket,
  List,
  Code,
  type LucideIcon,
  AlertTriangle,
} from 'lucide-react-native';

export const Icons = {
  // Navigation
  home: Home,
  add: Plus,
  stats: BarChart3,
  profile: User,
  settings: Settings,
  list: List,
  
  // Notifications
  bell: Bell,
  bellOff: BellOff,
  bellRing: BellRing,
  vibrate: Vibrate,
  
  // Habits
  target: Target,
  check: Check,
  checkCircle: CheckCircle2,
  xCircle: XCircle,
  play: PlayCircle,
  pause: PauseCircle,
  repeat: Repeat,
  
  // Gamification
  flame: Flame,
  star: Star,
  award: Award,
  trophy: Trophy,
  zap: Zap,
  crown: Crown,
  sparkles: Sparkles,
  gift: Gift,
  rocket: Rocket,
  
  // Time & Calendar
  calendar: Calendar,
  clock: Clock,
  timer: Timer,
  
  // Trends & Analytics
  trendingUp: TrendingUp,
  trendingDown: TrendingDown,
  activity: Activity,
  
  // Actions
  edit: Edit,
  trash: Trash2,
  more: MoreVertical,
  filter: Filter,
  search: Search,
  download: Download,
  upload: Upload,
  share: Share2,
  refresh: RefreshCw,
  
  // Navigation Arrows
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  arrowLeft: ArrowLeft,
  
  // UI
  close: X,
  info: Info,
  alert: AlertCircle,
  alertCircle: AlertCircle,
  alertTriangle: AlertTriangle,
  lightbulb: Lightbulb,
  
  // Theme
  moon: Moon,
  sun: Sun,
  sunrise: Sunrise,
  palette: Palette,
  
  // Media
  sound: Volume2,
  soundOff: VolumeX,
  image: Image,
  
  // Social
  users: Users,
  heart: Heart,
  bookmark: Bookmark,
  
  // Visibility
  eye: Eye,
  eyeOff: EyeOff,
  
  // Security
  lock: Lock,
  unlock: Unlock,
  shield: ShieldCheck,
  
  // Communication
  mail: Mail,
  phone: Phone,
  
  // Files
  file: FileText,
  folder: Folder,
  
  // Resize
  maximize: Maximize2,
  minimize: Minimize2,
  
  // Auth
  logout: LogOut,
  login: LogIn,
  userPlus: UserPlus,
  
  // Categories (for habit types)
  droplet: Droplet,
  coffee: Coffee,
  book: Book,
  dumbbell: Dumbbell,
  brain: Brain,
  smile: Smile,
  location: MapPin,
  
  // Development
  code: Code,
} as const;

export type IconName = keyof typeof Icons;
export type IconComponent = LucideIcon;