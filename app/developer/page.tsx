'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  FaGithub,
  FaStar,
  FaCodeBranch,
  FaCalendarAlt,
  FaEnvelope,
  FaLink,
  FaHeart,
  FaExternalLinkAlt,
  FaJs,
  FaPython,
  FaInstagram,
  FaFacebook,
  FaWhatsapp,
  FaUsers,
  FaUser,
  FaCoffee,
  FaArrowLeft,
  FaSpotify,
  FaBitcoin,
  FaEthereum,
} from 'react-icons/fa';
import { FaCodeCommit } from "react-icons/fa6";
import { SiTypescript, SiNextdotjs, SiTailwindcss, SiReact, SiExpress, SiNodedotjs } from 'react-icons/si';
import { BiCodeAlt } from 'react-icons/bi';

interface RepoData {
  stargazers_count: number;
  forks_count: number;
  language: string;
  updated_at: string;
  html_url: string;
  description: string | null;
  name: string;
  full_name: string;
  contributors_url: string;
}

interface Contributor {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

interface Commit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  html_url: string;
  author: {
    login: string;
    avatar_url: string;
  } | null;
}

const REPO_CACHE_KEY = 'github_repo_cache';
const CONTRIBUTORS_CACHE_KEY = 'github_contributors_cache';
const COMMITS_CACHE_KEY = 'github_commits_cache';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export default function DeveloperPage() {
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Try to get cached repo data
        let repoInfo: RepoData | null = null;
        const cachedRepo = localStorage.getItem(REPO_CACHE_KEY);
        if (cachedRepo) {
          const { data, timestamp } = JSON.parse(cachedRepo);
          if (Date.now() - timestamp < CACHE_DURATION) {
            repoInfo = data;
            setRepoData(data);
          }
        }

        // If no valid cache, fetch from GitHub
        if (!repoInfo) {
          const response = await fetch(
            'https://api.github.com/repos/devnovaa-id/quranku',
            {
              headers: {
                Accept: 'application/vnd.github.v3+json',
              },
            }
          );

          if (!response.ok) {
            throw new Error('Failed to fetch repository data');
          }

          const data = await response.json();
          repoInfo = {
            stargazers_count: data.stargazers_count,
            forks_count: data.forks_count,
            language: data.language,
            updated_at: data.updated_at,
            html_url: data.html_url,
            description: data.description,
            name: data.name,
            full_name: data.full_name,
            contributors_url: data.contributors_url,
          };

          localStorage.setItem(
            REPO_CACHE_KEY,
            JSON.stringify({ data: repoInfo, timestamp: Date.now() })
          );
          setRepoData(repoInfo);
        }

        // Fetch contributors
        if (repoInfo) {
          const cachedContributors = localStorage.getItem(CONTRIBUTORS_CACHE_KEY);
          if (cachedContributors) {
            const { data, timestamp } = JSON.parse(cachedContributors);
            if (Date.now() - timestamp < CACHE_DURATION) {
              setContributors(data);
            } else {
              await fetchContributors(repoInfo.contributors_url);
            }
          } else {
            await fetchContributors(repoInfo.contributors_url);
          }
        }

        // Fetch commits
        const cachedCommits = localStorage.getItem(COMMITS_CACHE_KEY);
        if (cachedCommits) {
          const { data, timestamp } = JSON.parse(cachedCommits);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setCommits(data);
          } else {
            await fetchCommits();
          }
        } else {
          await fetchCommits();
        }
      } catch (err) {
        console.error('Error fetching GitHub data:', err);
        setError('Unable to load repository data');
      } finally {
        setLoading(false);
      }
    };

    const fetchContributors = async (url: string) => {
      try {
        const response = await fetch(url, {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          const topContributors = data.slice(0, 10);
          setContributors(topContributors);
          localStorage.setItem(
            CONTRIBUTORS_CACHE_KEY,
            JSON.stringify({ data: topContributors, timestamp: Date.now() })
          );
        }
      } catch (error) {
        console.error('Error fetching contributors:', error);
      }
    };

    const fetchCommits = async () => {
      try {
        const response = await fetch(
          'https://api.github.com/repos/devnovaa-id/quranku/commits?per_page=5',
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setCommits(data);
          localStorage.setItem(
            COMMITS_CACHE_KEY,
            JSON.stringify({ data, timestamp: Date.now() })
          );
        }
      } catch (error) {
        console.error('Error fetching commits:', error);
      }
    };

    fetchData();
  }, []);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateString);
  };

  // Truncate commit message
  const truncateMessage = (message: string, maxLength = 60) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  // Skills list (added Node.js)
  const skills = [
    { name: 'JavaScript', icon: <FaJs className="text-yellow-500" /> },
    { name: 'TypeScript', icon: <SiTypescript className="text-blue-600" /> },
    { name: 'React', icon: <SiReact className="text-blue-400" /> },
    { name: 'Next.js', icon: <SiNextdotjs className="text-black" /> },
    { name: 'Node.js', icon: <SiNodedotjs className="text-green-600" /> },
    { name: 'Express', icon: <SiExpress className="text-gray-600" /> },
    { name: 'Python', icon: <FaPython className="text-blue-500" /> },
    { name: 'Tailwind CSS', icon: <SiTailwindcss className="text-cyan-500" /> },
  ];

  // Data sources
  const sources = [
    { name: 'equran.id', url: 'https://equran.id/' },
    { name: 'jadwalsholathariini.id', url: 'https://jadwalsholathariini.id/' },
    { name: 'quran.tazkia.ac.id', url: 'https://quran.tazkia.ac.id/' },
    { name: 'api.hadith.gading.dev', url: 'https://api.hadith.gading.dev' },
  ];

  // Social media links
  const socials = [
    {
      name: 'Instagram',
      icon: <FaInstagram className="w-5 h-5" />,
      url: 'https://www.instagram.com/thiskey_hihi',
      color: 'bg-gradient-to-br from-purple-500 to-pink-500',
    },
    {
      name: 'Facebook',
      icon: <FaFacebook className="w-5 h-5" />,
      url: 'https://facebook.com/thiskey_77',
      color: 'bg-blue-600',
    },
    {
      name: 'WhatsApp Channel',
      icon: <FaWhatsapp className="w-5 h-5" />,
      url: 'https://whatsapp.com/channel/0029VbBjOdCEAKW7afdv7g2y',
      color: 'bg-green-500',
    },
  ];

  // Crypto addresses (only BTC and ETH)
  const cryptoAddresses = [
    { name: 'BTC', address: '1Lzfk3fv3iVFW1DLESEcsgqT1vbpo1eSc5', icon: <FaBitcoin className="w-5 h-5" />, bgColor: 'bg-orange-500' },
    { name: 'ETH', address: '0x0dED3c0B467093075B096394AA63E13F8298FC93', icon: <FaEthereum className="w-5 h-5" />, bgColor: 'bg-blue-500' },
  ];

  // Skeleton components
  const SkeletonRepoStats = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-emerald-50 rounded-lg p-3 text-center">
          <div className="h-6 w-12 bg-emerald-200 rounded mx-auto mb-1"></div>
          <div className="h-3 w-16 bg-emerald-200 rounded mx-auto"></div>
        </div>
      ))}
    </div>
  );

  const SkeletonCommits = () => (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3">
          <div className="w-10 h-10 bg-emerald-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-emerald-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-emerald-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const SkeletonContributors = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-pulse">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex flex-col items-center p-3 bg-emerald-50 rounded-lg">
          <div className="w-16 h-16 bg-emerald-200 rounded-full mb-2"></div>
          <div className="h-3 w-20 bg-emerald-200 rounded mb-1"></div>
          <div className="h-2 w-12 bg-emerald-200 rounded"></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header with back button */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-emerald-700 hover:text-emerald-800 transition"
          >
            <FaArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden mb-6 transition-opacity duration-500">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-32"></div>
          <div className="relative px-6 pb-6">
            <div className="absolute -top-16 left-6">
              <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                <Image
                  src="/asset/dev/my_profile.png"
                  alt="Developer Profile"
                  width={112}
                  height={112}
                  priority
                  draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  className="object-cover w-full h-full protected-img"
                />
              </div>
            </div>

            <div className="pt-16">
              <h1 className="text-2xl font-bold text-gray-900">this key</h1>
              <p className="text-gray-600 mt-1">FullStack Developer</p>
              <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                <FaEnvelope className="w-4 h-4" />
                <a
                  href="mailto:this.key@devnova.icu"
                  className="hover:text-emerald-600 transition"
                >
                  this.key@devnova.icu
                </a>
              </p>

              <div className="mt-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <BiCodeAlt className="w-4 h-4" />
                  Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill.name}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-sm font-medium"
                    >
                      {skill.icon}
                      {skill.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Connect Section */}
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Connect</h2>
                <div className="flex flex-wrap gap-3">
                  {socials.map((social) => (
                    <a
                      key={social.name}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${social.color} text-white p-2 rounded-lg hover:opacity-90 transition flex items-center gap-2 text-sm`}
                      title={social.name}
                    >
                      {social.icon}
                      <span className="hidden xs:inline">{social.name}</span>
                    </a>
                  ))}
                </div>
              </div>

              {/* Donate Section - Icons only with aria-label, including BTC and ETH */}
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Buy me coffiee</h2>
                <div className="flex flex-wrap gap-3">
                  {/* Saweria */}
                  <a
                    href="https://saweria.co/thisssskeyyyy"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Donate via Saweria"
                    className="inline-flex items-center justify-center p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition shadow-sm"
                  >
                    <FaHeart className="w-5 h-5" />
                  </a>
                  {/* Ko-fi */}
                  <a
                    href="https://ko-fi.com/devnova_id"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Support on Ko-fi"
                    className="inline-flex items-center justify-center p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition shadow-sm"
                  >
                    <FaCoffee className="w-5 h-5" />
                  </a>
                  {/* GitHub */}
                  <a
                    href={repoData?.html_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub Repository"
                    className="inline-flex items-center justify-center p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition shadow-sm"
                  >
                    <FaGithub className="w-5 h-5" />
                  </a>

                  {/* BTC */}
                  <button
                    onClick={() => navigator.clipboard.writeText('1Lzfk3fv3iVFW1DLESEcsgqT1vbpo1eSc5')}
                    aria-label="Copy BTC address"
                    className="inline-flex items-center justify-center p-2 bg-orange-500 text-white rounded-lg hover:opacity-90 transition shadow-sm"
                  >
                    <FaBitcoin className="w-5 h-5" />
                  </button>

                  {/* ETH */}
                  <button
                    onClick={() => navigator.clipboard.writeText('0x0dED3c0B467093075B096394AA63E13F8298FC93')}
                    aria-label="Copy ETH address"
                    className="inline-flex items-center justify-center p-2 bg-blue-500 text-white rounded-lg hover:opacity-90 transition shadow-sm"
                  >
                    <FaEthereum className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Spotify Embed - Developer's Playlist */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6 transition-opacity duration-500">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FaSpotify className="w-5 h-5 text-green-500" />
            Developer&apos;s Playlist
          </h2>
          <iframe
            src="https://open.spotify.com/embed/playlist/4JaY2zqvVCVENkOpDQrZcr?utm_source=generator&theme=0"
            width="100%"
            height="352"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-lg"
          ></iframe>
        </div>

        {/* GitHub Repository Stats */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6 transition-opacity duration-500">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FaGithub className="w-5 h-5" />
            quranku Repository
          </h2>

          {loading ? (
            <SkeletonRepoStats />
          ) : error ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">
              {error}
            </div>
          ) : repoData ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-700">
                    {repoData.stargazers_count}
                  </div>
                  <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                    <FaStar className="w-3 h-3 text-yellow-500" />
                    Stars
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-700">
                    {repoData.forks_count}
                  </div>
                  <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                    <FaCodeBranch className="w-3 h-3" />
                    Forks
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-emerald-700">
                    {repoData.language || '-'}
                  </div>
                  <div className="text-xs text-gray-600">Main Language</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <div className="text-sm font-medium text-emerald-700">
                    {formatDate(repoData.updated_at)}
                  </div>
                  <div className="text-xs text-gray-600 flex items-center justify-center gap-1">
                    <FaCalendarAlt className="w-3 h-3" />
                    Last Updated
                  </div>
                </div>
              </div>

              {repoData?.description && (
                <p className="mt-4 text-sm text-gray-600 border-t border-gray-100 pt-4">
                  {repoData.description}
                </p>
              )}

              <a
                href={repoData?.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 transition"
              >
                View on GitHub
                <FaExternalLinkAlt className="w-3 h-3" />
              </a>
            </>
          ) : null}
        </div>

        {/* Recent Commits */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6 transition-opacity duration-500">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FaCodeCommit className="w-5 h-5" />
            Recent Commits
          </h2>

          {loading ? (
            <SkeletonCommits />
          ) : commits.length > 0 ? (
            <>
              <div className="space-y-4">
                {commits.map((commit) => (
                  <a
                    key={commit.sha}
                    href={commit.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:bg-emerald-50 p-3 rounded-lg transition -mx-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {commit.author?.avatar_url ? (
                          <img
                            src={commit.author.avatar_url}
                            alt={commit.author.login}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <FaUser className="w-5 h-5 text-emerald-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {truncateMessage(commit.commit.message, 70)}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          <span className="truncate max-w-[120px]">
                            {commit.commit.author.name}
                          </span>
                          <span>•</span>
                          <span>{formatRelativeTime(commit.commit.author.date)}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded">
                          {commit.sha.substring(0, 7)}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              <a
                href={`${repoData?.html_url}/commits`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 transition"
              >
                View all commits
                <FaExternalLinkAlt className="w-3 h-3" />
              </a>
            </>
          ) : null}
        </div>

        {/* Contributors Section */}
        {contributors.length > 0 && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6 transition-opacity duration-500">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FaUsers className="w-5 h-5" />
              Contributors
            </h2>

            {loading ? (
              <SkeletonContributors />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {contributors.map((contributor) => (
                  <a
                    key={contributor.id}
                    href={contributor.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center p-3 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition"
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-200 mb-2">
                      <img
                        src={contributor.avatar_url}
                        alt={contributor.login}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-800 text-center truncate w-full">
                      {contributor.login}
                    </span>
                    <span className="text-xs text-emerald-600 mt-1">
                      {contributor.contributions} commits
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Data Sources */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 transition-opacity duration-500">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FaLink className="w-5 h-5" />
            Data Sources
          </h2>
          <ul className="space-y-2">
            {sources.map((source) => (
              <li key={source.name}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                >
                  {source.name}
                  <FaExternalLinkAlt className="w-3 h-3" />
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 mt-4">
            quranku utilizes data sourced from the parties mentioned above. We sincerely appreciate and thank you for granting permission to use this data. However, if there are any objections, please contact the developer using the contact information provided above. We will promptly take action to remove the specified data.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} quranku by devnova-id
        </div>
      </div>

      {/* Custom breakpoint for social names */}
      <style jsx>{`
        @media (min-width: 480px) {
          .xs\\:inline {
            display: inline;
          }
        }
      
        .protected-img {
          -webkit-user-drag: none;
          -webkit-touch-callout: none;
          user-select: none;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}